"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { subscribeToMessages, markAsRead, sendMessage } from "@/lib/chat";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, Link as LinkIcon, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function ChatWindowPage() {
  const { convId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [conversation, setConversation] = useState<Record<string, unknown> | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !convId) return;

    // Fetch conversation metadata first
    const fetchConv = async () => {
      const docRef = doc(db, "conversations", convId as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.participants.includes(user.uid)) {
          toast.error("Unauthorized access");
          router.push('/messages');
          return;
        }
        setConversation({ id: docSnap.id, ...data });
        
        // Mark as read when opening
        await markAsRead(convId as string, user.uid);
      } else {
        router.push('/messages');
      }
    };

    fetchConv();

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(convId as string, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markAsRead(convId as string, user.uid); // auto-mark read on new msg when open
    });

    return () => unsubscribe();
  }, [user, convId, router]);

  useEffect(() => {
    // Auto-scroll to bottom limit
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !user || !conversation) return;

    const otherUid = conversation.participants.find((uid: string) => uid !== user.uid);
    const msgText = text;
    setText(""); // clear immediately for UX

    try {
      await sendMessage(convId as string, user, msgText, otherUid);
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleImageClick = () => {
    // In a real app we'd open a file picker and upload to Firebase Storage
    // Here we'll mock an image upload logic per instruction if needed or show a toast
    toast("Image upload not implemented in this demo", { icon: "📸" });
  };

  if (!user || loading || !conversation) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  const otherUid = conversation.participants.find((uid: string) => uid !== user.uid);
  const otherName = conversation.participantNames[otherUid] || 'Unknown User';
  const otherPhoto = conversation.participantPhotos[otherUid];
  const otherRole = conversation.participantRoles[otherUid];

  return (
    <div className="flex flex-col h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/messages" className="p-2 -ml-2 text-gray-500 hover:text-foreground hover:bg-gray-50 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </Link>
            
            <Link href={`/${otherRole === 'ngo_admin' ? 'ngo' : 'volunteer'}/${otherUid}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-primary-light flex items-center justify-center text-primary font-bold">
                {otherPhoto ? (
                  <img src={otherPhoto} alt={otherName} className="w-full h-full object-cover" />
                ) : (
                  otherName.charAt(0)
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground leading-tight">{otherName}</span>
                <span className="text-xs text-text-secondary capitalize">{otherRole === 'ngo_admin' ? 'NGO Admin' : 'Volunteer'}</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {conversation.relatedNeedId && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 font-mono">
                <LinkIcon size={12} /> Related Task
              </span>
            )}
            <button className="p-2 text-gray-400 hover:text-gray-800 rounded-full transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>
        {/* Mobile Need Chip */}
        {conversation.relatedNeedId && (
          <div className="sm:hidden px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-center text-[10px] text-amber-700 font-mono">
            <LinkIcon size={10} className="mr-1" /> Re: Related Task linked
          </div>
        )}
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
             <p className="text-sm bg-gray-100 px-4 py-2 rounded-lg">This is the start of your encrypted conversation with {otherName}.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user.uid;
            
            // Format time
            const time = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            // System Message
            if (msg.type === 'system') {
              return (
                <div key={msg.id || i} className="flex justify-center my-4">
                  <span className="text-xs italic bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id || i} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-auto hidden sm:block bg-gray-200">
                      {msg.senderPhoto ? (
                        <img src={msg.senderPhoto} alt="dp" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xs">{otherName.charAt(0)}</div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <div 
                      className={`px-4 py-2.5 shadow-sm text-sm ${
                        isMe 
                        ? 'bg-[#1D9E75] text-white rounded-[16px_16px_4px_16px]' 
                        : 'bg-[#F1EFE8] text-gray-900 rounded-[16px_16px_16px_4px]'
                      }`}
                    >
                      {msg.type === 'image' && msg.imageUrl && (
                        <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-md mb-2" />
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    
                    <div className={`flex items-center gap-1 text-[10px] text-gray-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span>{time}</span>
                      {isMe && (
                        <span className="ml-1">
                           <CheckCheck size={12} className={msg.read ? 'text-blue-500' : 'text-gray-300'} />
                        </span>
                      )}
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
          <button 
            type="button" 
            onClick={handleImageClick}
            className="p-3 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-gray-50 shrink-0 mb-1"
          >
            <ImageIcon size={22} />
          </button>
          
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
            disabled={!text.trim()}
            className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0 mb-1"
          >
            <Send size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
