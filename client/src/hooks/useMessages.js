import { useState, useEffect, useRef } from "react";
import { emitGetMessages } from "@/components/socket/socketEmitters";
import { onMessageNew, offMessageNew } from "@/components/socket/socketListeners";
import { normalizeMessage, formatMessageTime } from "@/utils/chatHelpers";

export function useMessages(activeChat) {
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

      setMessages(response.messages.map(normalizeMessage).reverse());
    });

    return () => {
      isCurrentConversation = false;
    };
  }, [activeChat]);

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
        parentMessageId: message.parentMessageId,
        conversationId: message.conversationId,
      };

      setMessages((previousMessages) => {
        if (previousMessages.some((item) => item._id === message._id)) {
          return previousMessages;
        }
        return [...previousMessages, transformedMessage];
      });
    };

    onMessageNew(handleMessageNew);

    return () => {
      offMessageNew(handleMessageNew);
    };
  }, [activeChat]);

  return { messages, setMessages };
}
