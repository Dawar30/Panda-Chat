import { useEffect } from "react";
import { getAuthToken } from "@/utils/tokenStorage";
import Socket from "@/components/socket/socket";

export function useSocketConnection(currentUserId) {
  useEffect(() => {
    if (!currentUserId) return;

    const token = getAuthToken();
    if (!token) return;

    Socket.auth = { token, userId: currentUserId };
    
    if (Socket.connected) {
      return;
    }
    
    Socket.connect();

    return () => {
      Socket.disconnect();
    };
  }, [currentUserId]);
}
