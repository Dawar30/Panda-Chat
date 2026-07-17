"use client";
import Doubletick from "@/components/svg/doubletick";

export default function AsideItems({ conversations, activeChat, handleThreadClick, showMobileChat }) {
  return (
    <aside
      className={`${showMobileChat ? "hidden md:block" : "block"} flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}
    >
      <div className="flex flex-col gap-4 p-4 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="mt-3 overflow-y-auto bg-white flex-1 no-scrollbar">
        <div className="divide-y divide-gray-100">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                activeChat?.id === conversation.id
                  ? "bg-blue-50"
                  : "hover:bg-blue-50/60"
              }`}
              type="button"
              onClick={() => handleThreadClick(conversation.id)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-primary-black">
                    {conversation.name || conversation.participants?.[0]?.name || "Unknown"}
                  </p>
                </div>
                <p className="mt-0.5 truncate text-xs text-primary font-regular">
                  {conversation.lastMessage || "No messages yet"}
                </p>
              </div>

              <div className="flex flex-col space-y-3 items-end self-end">
                <span className="text-[10px] font-light text-gray">
                  {conversation.updatedAt || "Just now"}
                </span>
                {conversation.unreadCount ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-blue-primary px-1.5 text-[10px] font-medium text-white">
                    {conversation.unreadCount}
                  </span>
                ) : (
                  <Doubletick width={20} height={20} color="#0185D1" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
