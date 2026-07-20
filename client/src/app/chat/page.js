"use client";

import { useState, useRef } from "react";
import Header from "@/components/header";
import AsideItems from "@/components/chat/asideitems";
import ChatSection from "@/components/chat/chatSection";
import { getUser } from "@/utils/tokenStorage";
import { emitSendMessage } from "@/components/socket/socketEmitters";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { formatMessageTime } from "@/utils/chatHelpers";

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const fileInputRef = useRef(null);
  const user = getUser();
  const currentUserId = user?._id;

  useSocketConnection(currentUserId);
  const { conversations, isLoading: isLoadingConversations } = useConversations(currentUserId);
  const { messages, setMessages } = useMessages(activeChat);
  const presence = usePresence(activeChat, currentUserId);

  // Handle new chat from header modal
  const handleNewChat = (selectedUser) => {
    // Create temporary conversation object for new chat
    const newChat = {
      id: `${selectedUser._id}`,
      name: selectedUser.name || selectedUser.username,
      participants: [currentUserId, selectedUser._id],
      type: "private",
      isNew: true,
      receiverId: selectedUser._id,
    };

    setActiveChat(newChat);
    setMessages([]);
    setShowMobileChat(true);
  };

  const handleThreadClick = (threadId) => {
    const selectedConversation = conversations.find((c) => c.id === threadId);
    if (selectedConversation) {
      setActiveChat(selectedConversation);
      setShowMobileChat(true);
    }
  };

  const handleSendMessage = () => {
    const userId = currentUserId;

    if (inputMessage.trim() && activeChat) {
      let receiverId;
      if (activeChat.isNew && activeChat.receiverId) {
        receiverId = activeChat.receiverId;
      } else if (activeChat.otherParticipant?._id) {
        receiverId = activeChat.otherParticipant._id;
      }

      if (receiverId) {
        const senderMessage = {
          _id: `temp-${Date.now()}`,
          id: `temp-${Date.now()}`,
          senderId: userId,
          sender: userId,
          text: inputMessage.trim(),
          content: inputMessage.trim(),
          time: formatMessageTime(new Date().toISOString()),
          createdAt: new Date().toISOString(),
          type: "text",
          isTemp: true,
        };
        setMessages((prev) => [...prev, senderMessage]);

        emitSendMessage(receiverId, inputMessage.trim());
        setInputMessage("");
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
        time: formatMessageTime(new Date().toISOString()),
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
      time: formatMessageTime(new Date().toISOString()),
      video: URL.createObjectURL(file),
      fileName: file.name,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleDocumentUpload = (file) => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      sender: "me",
      time: formatMessageTime(new Date().toISOString()),
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
              isLoading={isLoadingConversations}
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
              presence={presence}
            />
          </div>
        </div>
      </div>
    </>
  );
}
