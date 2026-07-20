"use client";

export default function ConversationSkeleton() {
  return (
    Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="flex w-full items-start gap-3 px-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="flex flex-col space-y-3 items-end self-end">
          <div className="h-3 w-12 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    ))
  );
}
