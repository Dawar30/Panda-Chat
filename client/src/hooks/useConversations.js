import { useState, useEffect } from "react";
import { emitGetConversations } from "@/components/socket/socketEmitters";
import { normalizeConversation } from "@/utils/chatHelpers";
import Socket from "@/components/socket/socket";

export function useConversations(currentUserId) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    let loadConversations;

    loadConversations = () => {
      emitGetConversations(currentUserId, (response) => {
        setIsLoading(false);
        if (response?.success) {
          const normalizedConversations = response.conversations.map(normalizeConversation);
          setConversations(normalizedConversations);
        }
      }, { timeout: 2000, maxRetries: 3 });
    };

    if (Socket.connected) {
      loadConversations();
    } else {
      Socket.once("connect", loadConversations);
    }

    return () => {
      if (loadConversations) {
        Socket.off("connect", loadConversations);
      }
    };
  }, [currentUserId]);

  return { conversations, isLoading };
}
