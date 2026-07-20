"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAuthToken, isTokenExpired } from "@/utils/tokenStorage";
import { logout } from "@/utils/auth";

export default function AuthInitializer({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    // Skip auth check on login page to prevent infinite redirect loop
    if (pathname === "/login") {
      return;
    }

    const token = getAuthToken();

    // If no token exists, redirect to login
    if (!token) {
      logout();
      return;
    }

    // If token is expired, logout
    if (isTokenExpired(token)) {
      logout();
      return;
    }

    // Token is valid, allow app to continue normally
  }, [pathname]);

  return <>{children}</>;
}
