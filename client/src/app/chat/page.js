"use client";

import { useState, useRef } from "react";
import Header from "@/components/header";
import AsideItems from "@/components/chat/asideitems";
import ChatSection from "@/components/chat/chatSection";
import { getUser } from "@/utils/tokenStorage";
import { emitSendMessage, emitEditMessage, emitDeleteMessage, emitReplyMessage } from "@/components/socket/socketEmitters";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useTyping } from "@/hooks/useTyping";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { formatMessageTime } from "@/utils/chatHelpers";

export default function ChatPage() {
  const [activeChat, setActiveChat] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const user = getUser();
  const currentUserId = user?._id;

  useSocketConnection(currentUserId);
  const { conversations, isLoading: isLoadingConversations, setConversations } = useConversations(currentUserId);
  const { messages, setMessages } = useMessages(activeChat, currentUserId);
  const presence = usePresence(activeChat, currentUserId);
  const { isSomeoneTyping, startTyping, stopTyping } = useTyping(currentUserId, activeChat);
  const { fileInputRef, handleFileClick, handleFileChange } = useMediaUpload(activeChat, currentUserId, replyingTo, setMessages, setReplyingTo);

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
      lastMessage: "",
      updatedAt: new Date().toISOString(),
    };

    // Add to conversations list so it appears in sidebar
    setConversations((prev) => [newChat, ...prev]);
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
      // If editing, update the message instead of sending new one
      if (editingMessageId) {
        emitEditMessage(editingMessageId, inputMessage.trim(), (response) => {
          if (response?.success) {
            setEditingMessageId(null);
            setInputMessage("");
            stopTyping();
          }
        });
        return;
      }

      let receiverId;
      if (activeChat.isNew && activeChat.receiverId) {
        receiverId = activeChat.receiverId;
      } else if (activeChat.otherParticipant?._id) {
        receiverId = activeChat.otherParticipant._id;
      }

      if (receiverId) {
        const temporaryMessageId = `temp-${Date.now()}`;
        const senderMessage = {
          _id: temporaryMessageId,
          id: temporaryMessageId,
          senderId: userId,
          sender: userId,
          text: inputMessage.trim(),
          content: inputMessage.trim(),
          time: formatMessageTime(new Date().toISOString()),
          createdAt: new Date().toISOString(),
          type: "text",
          isTemp: true,
          parentMessageId: replyingTo?._id,
          parentMessage: replyingTo,
        };
        setMessages((prev) => [...prev, senderMessage]);

        // Use reply emitter if replying to a message
        if (replyingTo) {
          emitReplyMessage(receiverId, replyingTo._id, inputMessage.trim(), null, (response) => {
            if (!response?.success || !response.message) {
              return;
            }

            const confirmedReply = {
              ...response.message,
              id: response.message._id,
              text: response.message.content,
              time: formatMessageTime(response.message.createdAt),
              parentMessageId: response.message.parentMessageId?._id || response.message.parentMessageId,
              parentMessage: response.message.parentMessageId || replyingTo,
            };

            setMessages((previousMessages) =>
              previousMessages.map((message) =>
                message._id === temporaryMessageId ? confirmedReply : message
              )
            );
          });
        } else {
          emitSendMessage(receiverId, inputMessage.trim());
        }
        setInputMessage("");
        setReplyingTo(null);
        stopTyping();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Escape" && editingMessageId) {
      e.preventDefault();
      setEditingMessageId(null);
      setInputMessage("");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEditMessage = (message) => {
    if (message.senderId === currentUserId) {
      setEditingMessageId(message._id);
      setInputMessage(message.text || message.content || "");
    }
  };

  const handleDeleteMessage = (messageId) => {
    emitDeleteMessage(messageId, (response) => {
      if (response?.success) {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputMessage("");
  };

  const handleReplyMessage = (message) => {
    const isOwnMessage = message.senderId === currentUserId || message.sender === "me";
    setReplyingTo({
      ...message,
      name: isOwnMessage ? "You" : activeChat?.otherParticipant?.name || activeChat?.name || "Unknown"
    });
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
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
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              editingMessageId={editingMessageId}
              handleCancelEdit={handleCancelEdit}
              isSomeoneTyping={isSomeoneTyping}
              handleInputChange={handleInputChange}
              replyingTo={replyingTo}
              handleCancelReply={handleCancelReply}
              handleReplyMessage={handleReplyMessage}
            />
          </div>
        </div>
      </div>
    </>
  );
}
