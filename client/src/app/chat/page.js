"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/header";
import AsideItems from "@/components/chat/asideitems";
import ChatSection from "@/components/chat/chatSection";
import { getUser } from "@/utils/tokenStorage";
import {
  emitGetConversations,
  emitGetMessages,
  emitSendMessage,
} from "@/components/socket/socketEmitters";
import {
  onConversationsGet,
  offConversationsGet,
  onMessagesGet,
  offMessagesGet,
  onMessageNew,
  offMessageNew,
} from "@/components/socket/socketListeners";

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const fileInputRef = useRef(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Handle new chat from header modal
  const handleNewChat = (user) => {
    const currentUser = getUser();

    // Create temporary conversation object for new chat
    const newChat = {
      id: `${user._id}`,
      name: user.name || user.username,
      participants: [currentUser?._id, user._id],
      type: "private",
      isNew: true,
      receiverId: user._id,
    };

    setActiveChat(newChat);
    setMessages([]);
    setShowMobileChat(true);
  };

  useEffect(() => {
    try {
      // Get user from token storage
      const user = getUser();
      if (user?._id) {
        setCurrentUserId(user._id);
        // Emit conversations:get
       emitGetConversations(user._id, (response) => {
  if (response?.success) {
    setConversations(response.conversations);
  } else {
    console.error("Failed to load conversations", response);
  }
});
      }

      // // Listen for conversations
      // onConversationsGet((data) => {
      //   setConversations(data);
      // });

      // Listen for messages
      onMessagesGet((data) => {
        setMessages(data);
      });

      // Listen for new messages
      onMessageNew((message) => {
        console.log("New message received:", message);
        // Transform backend message to frontend format
        const transformedMessage = {
          _id: message._id,
          id: message._id,
          senderId: message.senderId,
          sender: message.senderId,
          text: message.content, // Map content to text
          content: message.content,
          time: new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }), // Format time
          createdAt: message.createdAt,
          type: message.type,
          file: message.file,
          edited: message.edited,
          deletedForEveryone: message.deletedForEveryone,
          parentMessageId: message.parentMessageId,
          conversationId: message.conversationId,
        };
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, transformedMessage];
        });
      });
    } catch (error) {
      console.error("Error in socket setup:", error);
    }

    return () => {
      // offConversationsGet();
      offMessagesGet();
      offMessageNew();
    };
  }, []);

  useEffect(() => {
    console.log("Messages state:", messages);
  }, [messages]);

  // Auto-select first conversation
  useEffect(() => {
    try {
      if (conversations.length > 0 && !activeChat) {
        setActiveChat(conversations[0]);
      }
    } catch (error) {
      console.error("Error in auto-select first conversation:", error);
    }
  }, [conversations, activeChat]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat?.id) {
      emitGetMessages(activeChat.id);
    }
  }, [activeChat]);

  const handleThreadClick = (threadId) => {
    const selectedConversation = conversations.find((c) => c.id === threadId);
    if (selectedConversation) {
      setActiveChat(selectedConversation);
      setShowMobileChat(true);
    }
  };

  const handleSendMessage = () => {
    // Fallback to get current user ID if not set
    const userId = currentUserId || getUser()?._id;
    console.log("handleSendMessage called", {
      inputMessage,
      activeChat,
      currentUserId,
      userId,
    });

    if (inputMessage.trim() && activeChat) {
      // Get receiverId from activeChat
      let receiverId;
      if (activeChat.isNew && activeChat.receiverId) {
        // New chat - receiverId is directly available
        receiverId = activeChat.receiverId;
      } else if (activeChat.participants) {
        // Existing conversation - filter out current user
        receiverId = activeChat.participants.find((p) => p !== userId);
      }

      console.log("Receiver ID:", receiverId);
      if (receiverId) {
        const senderMessage = {
          _id: `temp-${Date.now()}`,
          id: `temp-${Date.now()}`,
          senderId: userId,
          sender: userId,
          text: inputMessage.trim(),
          content: inputMessage.trim(),
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt: new Date().toISOString(),
          type: "text",
          isTemp: true,
        };
        setMessages((prev) => [...prev, senderMessage]);

        // Emit via socket
        emitSendMessage(receiverId, inputMessage.trim());
        setInputMessage("");
      } else {
        console.error("No receiverId found");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          handleImageUpload(file);
        } else if (file.type.startsWith("video/")) {
          handleVideoUpload(file);
        } else {
          handleDocumentUpload(file);
        }
      });
      e.target.value = "";
    }
  };

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newMessage = {
        id: `msg-${Date.now()}`,
        sender: "me",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        image: e.target.result,
        fileName: file.name,
      };
      setMessages((prev) => [...prev, newMessage]);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (file) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      video: URL.createObjectURL(file),
      fileName: file.name,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDocumentUpload = (file) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      document: file.name,
      fileSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  return (
    <>
      <Header onNewChat={handleNewChat} />
      <div className="container mt-6">
        <div className="h-[calc(100vh-85px)] pb-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_minmax(0,1fr)] h-full">
            <AsideItems
              conversations={conversations}
              activeChat={activeChat}
              handleThreadClick={handleThreadClick}
              showMobileChat={showMobileChat}
            />
            <ChatSection
              activeChat={activeChat}
              messages={messages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              handleFileClick={handleFileClick}
              handleFileChange={handleFileChange}
              fileInputRef={fileInputRef}
              showMobileChat={showMobileChat}
              setShowMobileChat={setShowMobileChat}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </div>
    </>
  );
}
