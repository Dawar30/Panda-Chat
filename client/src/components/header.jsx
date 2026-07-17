"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logout } from "@/services/authService";
import { getAllUsers } from "@/services/userService";
import { clearAuthToken, getUser } from "@/services/tokenStorage";
import UsersModal from "./UsersModal";

export default function Header({ onNewChat }) {
    const [name] = useState(() => {
  if (typeof window !== "undefined") {
   const user = getUser();
   return user?.name || user?.username || "User";
  }
  return "User";
});
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      router.replace("/login");
    }
  };

  const handleNewChatClick = async () => {
    console.log("New chat button clicked");
    setLoading(true);
    try {
      const data = await getAllUsers();
      console.log("Users data received:", data);
      setUsers(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    console.log("User selected:", user);
    setIsModalOpen(false);
    if (onNewChat) {
      onNewChat(user);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo and App Name */}
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.avif" 
                alt="Chat App Logo" 
                width={40} 
                height={40} 
              />
              <h1 className="text-xl font-bold text-gray-900">Chat App</h1>
            </div>
            <div className="flex gap-4 items-center justify-center">
              <p>{name}</p>
              {/* New Chat Button */}
              <button
                type="button"
                onClick={handleNewChatClick}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-primary text-white hover:bg-blue-600 transition-colors"
                title="New Chat"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full hover:cursor-pointer bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <UsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserSelect={handleUserSelect}
        users={users}
        loading={loading}
      />
    </>
  );
}