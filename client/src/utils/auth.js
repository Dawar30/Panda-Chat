import { clearAuthToken } from "./tokenStorage";
import Socket from "@/components/socket/socket";

export const logout = () => {
    // Clear token and user from localStorage
    clearAuthToken();

    // Disconnect socket connection
    if (Socket.connected) {
        Socket.disconnect();
    }

    // Redirect to login page
    if (typeof window !== "undefined") {
        window.location.href = "/login";
    }
};
