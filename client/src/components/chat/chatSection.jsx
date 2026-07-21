"use client";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import Send from "@/components/svg/send";
import DottedHamburg from "@/components/svg/dottedhamburg";
import Import from "@/components/svg/import";
import Leftarrow from "@/components/svg/leftarrow";
import MessageActionsDropdown from "./MessageActionsDropdown";
import DeleteConfirmModal from "./DeleteConfirmModal";
import ReplyPreview from "./ReplyPreview";

const getFileType = (url) => {
  if (!url) return "document";
  const ext = url.split(".").pop().toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  const videoExts = ["mp4", "webm", "ogg", "mov"];
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  return "document";
};

const renderMedia = (file) => {
  if (!file?.url) return null;
  const fileType = getFileType(file.url);
  if (fileType === "image") {
    return (
      <div className="mb-2">
        <Image
          src={file.url}
          alt="image"
          width={300}
          height={200}
          className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
          onClick={() => window.open(file.url, "_blank")}
        />
      </div>
    );
  }
  if (fileType === "video") {
    return (
      <div className="mb-2">
        <video
          src={file.url}
          controls
          className="max-w-full rounded-lg"
        />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mb-2 p-2 rounded">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
          clipRule="evenodd"
        />
      </svg>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary-black hover:underline"
      >
        View Document
      </a>
    </div>
  );
};

const renderMessageContent = (message, isMe) => {
  const hasMedia = message.type === "document" && message.file?.url;
  return (
    <div
      className={`rounded-lg p-2 font-regular text-sm leading-relaxed ${
        isMe
          ? hasMedia ? "" : "bg-blue-primary text-white"
          : "border border-gray-200 bg-lightblue50 text-gray-700"
      }`}
    >
      {hasMedia && renderMedia(message.file)}
      {message.text && <p>{message.text}</p>}
      {message.details && (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm">
          {message.details.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )}
    </div>
  );
};

import ArrowDownIcon from "../svg/arrowdown";
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
  currentUserId,
  presence,
  onEditMessage,
  onDeleteMessage,
  editingMessageId,
  handleCancelEdit,
  isSomeoneTyping,
  handleInputChange,
  replyingTo,
  handleCancelReply,
  handleReplyMessage
}) {
  const messagesEndRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChat]);

  if (!activeChat) {
    return (
      <section
        className={`${showMobileChat ? "flex" : "hidden md:flex"} h-full flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden`}
      >
        <Image src="/logo.avif" alt="Chat App" width={72} height={72} priority />
        <h1 className="mt-5 text-2xl font-semibold text-primary-black">Chat App</h1>
        <p className="mt-2 max-w-sm px-6 text-center text-sm text-gray-500">
          Select a conversation to start messaging.
        </p>
      </section>
    );
  }

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
              {activeChat?.type === "group" ? "Group Chat" : (presence?.isOnline ? "Online" : presence?.lastSeen ? `Last seen ${new Date(presence.lastSeen).toLocaleString()}` : "")}
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
          const canEdit = isMe;

          return (
            <div
              key={message.id || message._id}
              className={`flex items-end gap-2 ${
                isMe ? "justify-end" : "justify-start"
              } group relative`}
            >
              {!isMe && (
                <div className="flex items-start ">
                  <div className="relative group flex  max-w-[85%] flex-col">
                    <span className="mb-1 text-sm font-medium text-primary-black">
                      {message.name}
                    </span>
                    {message.parentMessage && (
                      <div className="mb-1 border-l-2 border-gray-300 bg-gray-50 px-2 py-1 rounded-r">
                        <span className="text-xs font-semibold text-gray-700">
                          {activeChat?.name || activeChat?.participants?.[0]?.name || "Unknown"}
                        </span>
                        <p className="text-xs text-gray-500 truncate">
                          {message.parentMessage.text || message.parentMessage.content || "Media"}
                        </p>
                      </div>
                    )}
                    {renderMessageContent(message, isMe)}
                    <span className="mt-1 text-[10px] font-light text-gray-400 whitespace-nowrap">
                      {message.time}
                    </span>
                    <div className="absolute top-0 right-1 z-10 ">
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(message._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      >
                        <ArrowDownIcon/>
                      </button>
                      <MessageActionsDropdown
                        isOpen={activeDropdown === message._id}
                        onClose={() => setActiveDropdown(null)}
                        onEdit={() => onEditMessage(message)}
                        onReply={() => handleReplyMessage(message)}
                        onDelete={() => {
                          setMessageToDelete(message);
                          setShowDeleteModal(true);
                          setActiveDropdown(null);
                        }}
                        canEdit={canEdit}
                        isSender={isMe}
                      />
                    </div>
                  </div>
                </div>
              )}
              {isMe && (
                <div className="flex justify-end items-end gap-3">
                  <div className="relative group flex flex-col items-end">
                    <span className="mb-1 text-sm font-medium text-gray-900">
                      Ahmad
                    </span>
                    {message.parentMessage && (
                      <div className="mb-1 border-l-2 border-blue-300 bg-blue-50 px-2 py-1 rounded-r">
                        <span className="text-xs font-semibold text-blue-700">
                            {activeChat?.name || activeChat?.participants?.[0]?.name || "Unknown"}
                        </span>
                        <p className="text-xs text-blue-500 truncate">
                          {message.parentMessage.text || message.parentMessage.content || "Media"}
                        </p>
                      </div>
                    )}
                    {renderMessageContent(message, isMe)}
                    <span className="mt-1 text-[11px] text-gray-400">
                      {message.time}
                    </span>
                    <div className="absolute top-5 left-1">
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(message._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      >
                       <ArrowDownIcon/>
                      </button>
                      <MessageActionsDropdown
                        isOpen={activeDropdown === message._id}
                        onClose={() => setActiveDropdown(null)}
                        onEdit={() => onEditMessage(message)}
                        onReply={() => handleReplyMessage(message)}
                        onDelete={() => {
                          setMessageToDelete(message);
                          setShowDeleteModal(true);
                          setActiveDropdown(null);
                        }}
                        canEdit={canEdit}
                        isSender={isMe}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {isSomeoneTyping && (
        <div className="px-5 py-2 text-sm text-gray-500 italic">
          {activeChat?.name || "Someone"} is typing...
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMessageToDelete(null);
        }}
        onConfirm={() => {
          if (messageToDelete) {
            onDeleteMessage(messageToDelete._id);
            setShowDeleteModal(false);
            setMessageToDelete(null);
          }
        }}
      />

      <div className="border-t border-gray-200 px-0 md:px-4 py-4">
        <ReplyPreview replyingTo={replyingTo} onCancel={handleCancelReply} />
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
            placeholder={editingMessageId ? "Edit message..." : "Type a message..."}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {editingMessageId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSendMessage}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-primary px-4 py-2 text-sm md:text-base font-medium text-white shadow-sm hover:bg-[#0174B4]"
          >
            <Send width={14} height={14} color="white" />
            {editingMessageId ? "Update" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}
