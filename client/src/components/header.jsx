"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logout } from "@/services/authService";
import { clearAuthToken } from "@/services/tokenStorage";

export default function Header() {
    const [name] = useState(() => {
  if (typeof window !== "undefined") {
   return localStorage.getItem("panda-chat-name") || "User";
  }
  return "User";
});
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      router.replace("/login");
    }
  };

  return (
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
  );
}