import { useState, useEffect } from "react";
import { emitGetPresence } from "@/components/socket/socketEmitters";
import { onUsersOnline, offUsersOnline } from "@/components/socket/socketListeners";

export function usePresence(activeChat, currentUserId) {
  const [presence, setPresence] = useState({ isOnline: false, status: null, lastSeen: null });

  useEffect(() => {
    if (!activeChat || activeChat.type === "group") {
      return;
    }

    let isCurrentChat = true;

    const participantId = activeChat.otherParticipant?._id || activeChat.receiverId;
    
    if (participantId) {
      emitGetPresence(participantId, (response) => {
        if (!isCurrentChat) return;
        
        if (response?.success) {
          setPresence({
            isOnline: response.isOnline,
            status: response.status,
            lastSeen: response.lastSeen,
          });
        } else {
          setPresence({ isOnline: false, status: null, lastSeen: null });
        }
      });
    }

    return () => {
      isCurrentChat = false;
    };
  }, [activeChat, currentUserId]);

  useEffect(() => {
    const handleUsersOnline = (onlineUserIds) => {
      if (!activeChat || activeChat.type === "group") {
        return;
      }

      const participantId = activeChat.otherParticipant?._id || activeChat.receiverId;
      
      if (participantId) {
        const isOnline = onlineUserIds.includes(participantId);
        setPresence((prev) => ({ ...prev, isOnline }));
      }
    };

    onUsersOnline(handleUsersOnline);

    return () => {
      offUsersOnline(handleUsersOnline);
    };
  }, [activeChat, currentUserId]);

  return presence;
}
