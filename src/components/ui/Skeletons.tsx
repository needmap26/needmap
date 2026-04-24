import React from 'react';

export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-8 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="animate-pulse flex flex-col w-full">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center p-4 gap-4 border-b border-gray-50">
          <div className="w-14 h-14 bg-gray-200 rounded-full shrink-0"></div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="animate-pulse flex flex-col h-full gap-4 w-full px-4 py-6">
      <div className="flex w-full justify-start">
        <div className="flex gap-2 max-w-[75%]">
          <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0 mt-auto hidden sm:block"></div>
          <div className="h-16 bg-gray-100 rounded-[16px_16px_16px_4px] w-48"></div>
        </div>
      </div>
      <div className="flex w-full justify-end">
        <div className="h-12 bg-gray-200 rounded-[16px_16px_4px_16px] w-64"></div>
      </div>
      <div className="flex w-full justify-start">
        <div className="flex gap-2 max-w-[75%]">
          <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0 mt-auto hidden sm:block"></div>
          <div className="h-20 bg-gray-100 rounded-[16px_16px_16px_4px] w-56"></div>
        </div>
      </div>
    </div>
  );
}
