"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { collection, query, onSnapshot, addDoc, doc, getDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Send, Users, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { ChatSkeleton } from "@/components/ui/Skeletons";

export default function GroupChatPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [group, setGroup] = useState<any | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !groupId) return;

    // Fetch Group metadata
    const fetchGroup = async () => {
      const docRef = doc(db, "groups", groupId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.ngoId !== user.uid && !data.members?.includes(user.uid)) {
          toast.error("Unauthorized access to group");
          router.push('/dashboard');
          return;
        }
        setGroup({ id: docSnap.id, ...data });
      } else {
        router.push('/dashboard');
      }
    };

    fetchGroup();

    // Subscribe to messages in groupMessages subcollection or root collection
    // Let's use a root collection for scalability: groupMessages -> { groupId, senderId, text, ... }
    const q = query(
      collection(db, `groups/${groupId}/messages`),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, groupId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !user || !group || sending) return;

    const msgText = text;
    setText(""); 
    setSending(true);

    try {
      const senderName = profile?.name || profile?.ngoName || user.displayName || "User";
      await addDoc(collection(db, `groups/${groupId}/messages`), {
        senderId: user.uid,
        senderName: senderName,
        text: msgText,
        createdAt: serverTimestamp()
      });
    } catch {
      toast.error("Failed to send message");
      setText(msgText); // restore message
    } finally {
      setSending(false);
    }
  };

  if (!user || loading || !group) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#FAFAF9]">
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 h-16"></header>
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["ngo", "volunteer"]}>
      <div className="flex flex-col h-[100dvh] bg-[#FAFAF9]">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 -ml-2 text-gray-500 hover:text-foreground hover:bg-gray-50 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  <Users size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground leading-tight">{group.groupName}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Shield size={10} /> {group.ngoName || "NGO Group"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
               <p className="text-sm bg-gray-100 px-4 py-2 rounded-lg">Welcome to the group chat for {group.groupName}.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === user.uid;
              const time = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div key={msg.id || i} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto hidden sm:block bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                        {msg.senderName?.charAt(0) || "U"}
                      </div>
                    )}

                    <div className="flex flex-col gap-1">
                      {!isMe && (
                        <span className="text-[10px] text-gray-500 ml-1">{msg.senderName}</span>
                      )}
                      <div 
                        className={`px-4 py-2.5 shadow-sm text-sm ${
                          isMe 
                          ? 'bg-[#1D9E75] text-white rounded-[16px_16px_4px_16px]' 
                          : 'bg-[#F1EFE8] text-gray-900 rounded-[16px_16px_16px_4px]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                      
                      <div className={`flex items-center gap-1 text-[10px] text-gray-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span>{time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-1" />
        </main>

        {/* Input Area */}
        <footer className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-3xl mx-auto w-full relative flex items-end gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all shadow-inner">
              <textarea
                className="w-full max-h-32 bg-transparent p-3 outline-none resize-none text-sm placeholder-gray-400"
                placeholder="Type a message..."
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            <button 
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="bg-primary text-white rounded-full hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0 mb-1 h-12 w-12 flex items-center justify-center"
            >
              {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Send size={20} />}
            </button>
          </div>
        </footer>
      </div>
    </ProtectedRoute>
  );
}
