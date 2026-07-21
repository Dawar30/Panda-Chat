import { useState, useEffect, useRef } from "react";
import { emitGetMessages } from "@/components/socket/socketEmitters";
import { onMessageNew, offMessageNew, onMessageReply, offMessageReply, onMessageUpdated, offMessageUpdated, onMessageDeleted, offMessageDeleted } from "@/components/socket/socketListeners";
import { normalizeMessage, formatMessageTime } from "@/utils/chatHelpers";

export function useMessages(activeChat, currentUserId) {
  const [messages, setMessages] = useState([]);
  const prevChatIdRef = useRef(null);

  useEffect(() => {
    const currentChatId = activeChat?.id;
    
    if (!currentChatId || activeChat?.isNew) {
      if (prevChatIdRef.current !== currentChatId) {
        // Clear messages when chat changes - legitimate use case
        setMessages([]);
        prevChatIdRef.current = currentChatId;
      }
      return;
    }

    if (prevChatIdRef.current !== currentChatId) {
      // Clear messages when chat changes - legitimate use case
      setMessages([]);
      prevChatIdRef.current = currentChatId;
    }

    let isCurrentConversation = true;

    emitGetMessages(currentChatId, (response) => {
      if (!isCurrentConversation || !response?.success) {
        return;
      }

      const normalizedMessages = response.messages.map(msg => {
        const normalized = normalizeMessage(msg);
        // Handle parent message for initial load
        if (msg.parentMessageId && typeof msg.parentMessageId === 'object') {
          const isOwnMessage = msg.parentMessageId.senderId?.toString() === currentUserId;
          normalized.parentMessage = {
            ...msg.parentMessageId,
            name: isOwnMessage 
              ? "You" 
              : activeChat?.otherParticipant?.name || activeChat?.name || "Unknown"
          };
          normalized.parentMessageId = msg.parentMessageId._id;
        }
        return normalized;
      });
      setMessages(normalizedMessages.reverse());
    });

    return () => {
      isCurrentConversation = false;
    };
  }, [activeChat, currentUserId]);

  useEffect(() => {
    const handleMessageNew = (message) => {
      if (!activeChat?.id || String(message.conversationId) !== String(activeChat.id)) {
        return;
      }

      const transformedMessage = {
        _id: message._id,
        id: message._id,
        senderId: message.senderId,
        sender: message.senderId,
        text: message.content,
        content: message.content,
        time: formatMessageTime(message.createdAt),
        createdAt: message.createdAt,
        type: message.type,
        file: message.file,
        edited: message.edited,
        deletedForEveryone: message.deletedForEveryone,
        parentMessageId: message.parentMessageId?._id || message.parentMessageId,
        parentMessage: message.parentMessageId || message.parentMessage,
        conversationId: message.conversationId,
      };

      // If parentMessageId is a populated object, extract sender name
      if (message.parentMessageId && typeof message.parentMessageId === 'object') {
        const isOwnMessage = message.parentMessageId.senderId?.toString() === currentUserId;
        transformedMessage.parentMessage = {
          ...message.parentMessageId,
          name: isOwnMessage 
            ? "You" 
            : activeChat?.otherParticipant?.name || activeChat?.name || "Unknown"
        };
      }

      setMessages((previousMessages) => {
        if (previousMessages.some((item) => item._id === message._id)) {
          return previousMessages;
        }
        return [...previousMessages, transformedMessage];
      });
    };

    const handleMessageUpdated = (updatedMessage) => {
      if (!activeChat?.id || String(updatedMessage.conversationId) !== String(activeChat.id)) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          message._id === updatedMessage._id
            ? {
                ...message,
                text: updatedMessage.content,
                content: updatedMessage.content,
                edited: updatedMessage.edited,
              }
            : message
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((previousMessages) =>
        previousMessages.filter((message) => message._id !== messageId)
      );
    };

    onMessageNew(handleMessageNew);
    onMessageReply(handleMessageNew);
    onMessageUpdated(handleMessageUpdated);
    onMessageDeleted(handleMessageDeleted);

    return () => {
      offMessageNew(handleMessageNew);
      offMessageReply(handleMessageNew);
      offMessageUpdated(handleMessageUpdated);
      offMessageDeleted(handleMessageDeleted);
    };
  }, [activeChat, currentUserId]);

  return { messages, setMessages };
}
