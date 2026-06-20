"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { logout } from "@/services/authService";
import { clearAuthToken } from "@/services/tokenStorage";

export default function Header() {
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

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}