"use client";
import { useRef, useEffect } from "react";

export default function MessageActionsDropdown({ isOpen, onClose, onEdit, onDelete, canEdit, isSender, onReply }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-1000 w-32 rounded-lg border border-gray-200 bg-white shadow-lg ${
        isSender ? "right-6 top-8" : "left-8 top-8"
      }`}
    >
      <div className="py-1">
        <button
          type="button"
          onClick={onReply}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
        >
          Reply
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
          >
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
