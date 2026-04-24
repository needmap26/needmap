"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeToConversations } from "@/lib/chat";
import { Navbar } from "@/components/Navbar";
import { Search, MessageSquare } from "lucide-react";
import { MessageListSkeleton } from "@/components/ui/Skeletons";

export default function MessagesListPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Record<string, any>[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filteredConversations = conversations.filter(conv => {
    const otherUid = conv.participants.find((uid: string) => uid !== user?.uid);
    const otherName = conv.participantNames[otherUid] || 'Unknown User';
    return otherName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getRelativeTime = (timestamp: { toDate?: () => Date } | Date | string | number | null) => {
    if (!timestamp) return '';
    const date = (typeof timestamp === 'object' && timestamp && 'toDate' in timestamp && typeof timestamp.toDate === 'function') 
      ? timestamp.toDate() 
      : new Date(timestamp as string | number);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
           <MessageListSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <MessageSquare size={32} className="text-primary" />
            Messages
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E3DB] overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
          {/* Search Header */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <MessageListSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                  <MessageSquare size={40} className="text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Start a conversation with NGOs</h3>
                  <p className="text-text-secondary mt-1 text-sm max-w-xs mx-auto">
                    You have no active chats. Find an NGO on the map or their profile to begin.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredConversations.map(conv => {
                  const otherUid = conv.participants.find((uid: string) => uid !== user.uid);
                  const otherName = conv.participantNames?.[otherUid] || 'Unknown User';
                  const otherPhoto = conv.participantPhotos?.[otherUid];
                  const otherRole = conv.participantRoles?.[otherUid];
                  const unreadCount = conv.unreadCount?.[user.uid] || 0;
                  
                  return (
                    <li key={conv.id} className="transition-colors hover:bg-gray-50 group">
                      <Link href={`/messages/${conv.id}`} className="flex items-center p-4 gap-4">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-primary-light flex items-center justify-center text-xl font-bold text-primary">
                          {otherPhoto ? (
                            <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover" />
                          ) : (
                            otherName.charAt(0)
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-base font-bold truncate ${unreadCount > 0 ? 'text-foreground' : 'text-gray-800'}`}>
                              {otherName}
                            </h3>
                            <span className={`text-xs whitespace-nowrap ml-2 ${unreadCount > 0 ? 'text-primary font-bold' : 'text-gray-400'}`}>
                              {getRelativeTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-mono uppercase tracking-wide">
                              {otherRole === 'ngo_admin' ? 'NGO' : 'Volunteer'}
                            </span>
                            {conv.relatedNeedId && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-mono truncate max-w-[100px]">
                                Re: Task
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate pr-4 ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                              {conv.lastMessageSenderId === user.uid ? 'You: ' : ''}
                              {conv.lastMessage || 'Connected'}
                            </p>
                            {unreadCount > 0 && (
                              <span className="shrink-0 w-6 h-6 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
