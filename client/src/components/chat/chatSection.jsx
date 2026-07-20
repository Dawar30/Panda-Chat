"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";
import Send from "@/components/svg/send";
import DottedHamburg from "@/components/svg/dottedhamburg";
import Import from "@/components/svg/import";
import Leftarrow from "@/components/svg/leftarrow";

export default function ChatSection({ 
  activeChat, 
  messages, 
  inputMessage, 
  setInputMessage, 
  handleSendMessage, 
  handleKeyPress, 
  handleFileClick, 
  handleFileChange, 
  fileInputRef, 
  showMobileChat, 
  setShowMobileChat,
  currentUserId 
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  return (
    <section
      className={`${showMobileChat ? "flex" : "hidden md:flex"} h-full flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setShowMobileChat(false)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 md:hidden"
        aria-label="Back to threads"
      >
        <Leftarrow width={20} height={20} color="#6B7280" />
      </button>
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[18px] font-medium text-primary-black">
              {activeChat?.name || activeChat?.participants?.[0]?.name || "User"}
            </p>
            <p className="text-sm font-regular text-primary">
              {activeChat?.type === "group" ? "Group Chat" : "Direct Message"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center hover:cursor-pointer hover:border-none rounded-full hover:bg-gray50"
          >
            <DottedHamburg width={22} height={22} color="#6B7280" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6 no-scrollbar">
        <div className="relative flex items-center justify-center">
          <div className="grow border-t border-gray-200"></div>
          <span className="mx-4 shrink-0 px-2 text-xs font-regular text-gray-500">
            Today
          </span>
          <div className="grow border-t border-gray-200"></div>
        </div>

        {messages.map((message) => {
          const isMe = message.senderId === currentUserId || message.sender === "me";

          return (
            <div
              key={message.id || message._id}
              className={`flex items-end gap-2 ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {!isMe && (
                <div className="flex items-start gap-3">
                  <div className="flex max-w-[90%] flex-col">
                    <span className="mb-1 text-sm font-medium text-primary-black">
                      {message.name}
                    </span>
                    <div
                      className={`rounded-lg p-2 font-regular text-sm leading-relaxed ${
                        isMe
                          ? "bg-blue-primary text-primary-black"
                          : "border border-gray-200 bg-lightblue50 text-gray-700"
                      }`}
                    >
                      {message.image && (
                        <div className="mb-2">
                          <Image
                            src={message.image}
                            alt={message.fileName}
                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                            onClick={() =>
                              window.open(message.image, "_blank")
                            }
                          />
                          <p className="mt-1 text-xs opacity-70">
                            {message.fileName}
                          </p>
                        </div>
                      )}
                      {message.video && (
                        <div className="mb-2">
                          <video
                            src={message.video}
                            controls
                            className="max-w-full rounded-lg"
                          />
                          <p className="mt-1 text-xs opacity-70">
                            {message.fileName}
                          </p>
                        </div>
                      )}
                      {message.document && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-primary-black">
                              {message.document}
                            </p>
                            <p className="text-xs opacity-70 text-primary-black">
                              {message.fileSize}
                            </p>
                          </div>
                        </div>
                      )}
                      {message.text && <p>{message.text}</p>}
                      {message.details && (
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
                          {message.details.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <span className="mt-1 text-[10px] font-light text-gray-400">
                      {message.time}
                    </span>
                  </div>
                </div>
              )}
              {isMe && (
                <div className="flex justify-end items-end gap-3">
                  <div className="flex flex-col items-end">
                    <span className="mb-1 text-sm font-medium text-gray-900">
                      Ahmad
                    </span>
                    <div
                      className={`rounded-lg px-4 py-3 font-regular text-sm leading-relaxed ${
                        isMe
                          ? "bg-blue-primary text-white"
                          : "border border-gray-200 bg-lightblue50 text-gray-700"
                      }`}
                    >
                      {message.image && (
                        <div className="mb-2">
                          <Image
                            src={message.image}
                            alt={message.fileName}
                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                            onClick={() =>
                              window.open(message.image, "_blank")
                            }
                          />
                          <p className="mt-1 text-xs opacity-70">
                            {message.fileName}
                          </p>
                        </div>
                      )}
                      {message.video && (
                        <div className="mb-2">
                          <video
                            src={message.video}
                            controls
                            className="max-w-full rounded-lg"
                          />
                          <p className="mt-1 text-xs opacity-70">
                            {message.fileName}
                          </p>
                        </div>
                      )}
                      {message.document && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded">
                          <div>
                            <p className="text-sm font-medium text-primary-black">
                              {message.document}
                            </p>
                            <p className="text-xs opacity-70 text-primary-black">
                              {message.fileSize}
                            </p>
                          </div>
                        </div>
                      )}
                      {message.text && <p>{message.text}</p>}
                      {message.details && (
                        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
                          {message.details.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                    <span className="mt-1 text-[11px] text-gray-400">
                      {message.time}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 px-0 md:px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleFileClick}
            className="hidden md:flex h-9 w-9 items-center justify-center hover:cursor-pointer hover:border-none rounded-full hover:bg-gray50"
          >
            <Import width={20} height={20} color="#6B7280" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-primary px-4 py-2 text-sm md:text-base font-medium text-white shadow-sm hover:bg-[#0174B4]"
          >
            <Send width={14} height={14} color="white" />
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
