"use client";

export default function ReplyPreview({ replyingTo, onCancel }) {
  if (!replyingTo) return null;

  return (
    <div className="border-l-4 border-blue-primary bg-gray-50 px-4 py-2 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-900">
            {replyingTo.name || "Unknown"}
          </span>
          <span className="text-[10px] text-gray-500">Replying to</span>
        </div>
        <p className="text-sm text-gray-600 truncate">
          {replyingTo.text || replyingTo.content || "Media"}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
