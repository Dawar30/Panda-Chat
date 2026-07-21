import { useState, useEffect, useCallback, useRef } from "react";
import { emitTypingStart, emitTypingStop } from "@/components/socket/socketEmitters";
import { onTypingStart, onTypingStop, offTypingStart, offTypingStop } from "@/components/socket/socketListeners";

export function useTyping(currentUserId, activeChat) {
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  const startTyping = useCallback(() => {
    if (!activeChat?.otherParticipant?._id) return;

    emitTypingStart(activeChat.otherParticipant._id);
  }, [activeChat]);

  const stopTyping = useCallback(() => {
    if (!activeChat?.otherParticipant?._id) return;

    emitTypingStop(activeChat.otherParticipant._id);
  }, [activeChat]);

  useEffect(() => {
    const handleTypingStart = (data) => {
      if (data.userId && data.userId !== currentUserId) {
        setTypingUsers((prev) => new Set([...prev, data.userId]));
      }
    };

    const handleTypingStop = (data) => {
      if (data.userId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    onTypingStart(handleTypingStart);
    onTypingStop(handleTypingStop);

    return () => {
      offTypingStart(handleTypingStart);
      offTypingStop(handleTypingStop);
    };
  }, [currentUserId]);

  const isSomeoneTyping = typingUsers.size > 0;

  return {
    isSomeoneTyping,
    startTyping,
    stopTyping,
  };
}
