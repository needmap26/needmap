"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { NotificationMsg } from "@/types";
import { X, Bell, CheckCheck } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationMsg)));
    }, (err) => console.error("NotificationDrawer listener error:", err));
    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      if (n.id) {
        batch.update(doc(db, "notifications", n.id), { read: true });
      }
    });
    await batch.commit();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
          onClick={onClose}
        ></div>
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.read) && (
              <button onClick={markAllAsRead} className="text-xs text-primary hover:underline flex items-center gap-1" title="Mark all as read">
                <CheckCheck size={14} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 rounded-md transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              No notifications yet.
            </div>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => { if (!n.read && n.id) markAsRead(n.id) }}
                className={`p-4 rounded-xl border ${!n.read ? 'border-l-4 border-l-primary bg-emerald-50 border-emerald-100 shadow-sm cursor-pointer' : 'border-gray-100 bg-gray-50'}`}
              >
                <p className={`text-sm ${!n.read ? 'text-foreground font-medium' : 'text-text-secondary'}`}>
                  {n.message}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
