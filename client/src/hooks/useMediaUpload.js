import { useState, useRef } from "react";
import { emitSendMessage, emitReplyMessage } from "@/components/socket/socketEmitters";
import { formatMessageTime } from "@/utils/chatHelpers";

export function useMediaUpload(activeChat, currentUserId, replyingTo, setMessages, setReplyingTo) {
  const fileInputRef = useRef(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        handleFileUpload(file);
      });
      e.target.value = "";
    }
  };

  const getReceiverId = () => {
    if (activeChat.isNew && activeChat.receiverId) {
      return activeChat.receiverId;
    } else if (activeChat.otherParticipant?._id) {
      return activeChat.otherParticipant._id;
    }
    return null;
  };

  const createTempMessage = (fileData) => {
    const temporaryMessageId = `temp-${Date.now()}`;
    return {
      _id: temporaryMessageId,
      id: temporaryMessageId,
      senderId: currentUserId,
      sender: currentUserId,
      text: "",
      content: "",
      time: formatMessageTime(new Date().toISOString()),
      createdAt: new Date().toISOString(),
      type: "document",
      file: { url: fileData },
      isTemp: true,
    };
  };

  const handleServerResponse = (response, temporaryMessageId) => {
    if (!response?.success || !response.message) return;
    
    const confirmedMessage = {
      ...response.message,
      id: response.message._id,
      text: response.message.content,
      time: formatMessageTime(response.message.createdAt),
      parentMessageId: response.message.parentMessageId?._id || response.message.parentMessageId,
      parentMessage: response.message.parentMessageId || replyingTo,
    };

    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        message._id === temporaryMessageId ? confirmedMessage : message
      )
    );
  };

  const handleFileUpload = (file) => {
    const receiverId = getReceiverId();
    if (!receiverId) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = e.target.result;
      const tempMessage = createTempMessage(fileData);
      setMessages((prev) => [...prev, tempMessage]);

      const emitFn = replyingTo ? emitReplyMessage : emitSendMessage;
      const emitArgs = replyingTo 
        ? [receiverId, replyingTo._id, "", fileData]
        : [receiverId, "", fileData];

      emitFn(...emitArgs, (response) => {
        handleServerResponse(response, tempMessage._id);
      });

      setReplyingTo(null);
    };

    reader.readAsDataURL(file);
  };

  return {
    fileInputRef,
    handleFileClick,
    handleFileChange,
  };
}
