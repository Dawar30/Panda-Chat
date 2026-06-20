"use client";

import { useEffect } from "react";
import Header from "@/components/header";
import { useRouter } from "next/navigation";
import { logout } from "@/services/authService";
import { clearAuthToken, isAuthenticated } from "@/services/tokenStorage";
import Messages from "@/components/message";
export default function ChatPage() {
  const router = useRouter();

  // useEffect(() => {
  //   if (!isAuthenticated()) {
  //     router.replace("/login");
  //   }
  // }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      router.replace("/login");
    }
  };

  return (
    <>
      <Header />
      <div className="container mt-6">
        <Messages />
      </div>
    </>
  );
}