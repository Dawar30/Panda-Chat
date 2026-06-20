"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/tokenStorage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? "/chat" : "/login");
  }, [router]);

  return null;
}
