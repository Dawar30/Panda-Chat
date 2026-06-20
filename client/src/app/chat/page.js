"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/services/authService";
import { clearAuthToken, isAuthenticated } from "@/services/tokenStorage";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuthToken();
      router.replace("/login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-lg shadow-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Chat box</h1>
            <p className="mt-2 text-slate-500">You are authenticated and ready to start chatting.</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
          Chat UI can be mounted here after the auth flow.
        </div>
      </section>
    </main>
  );
}