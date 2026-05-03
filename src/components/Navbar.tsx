"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, Map as MapIcon, LayoutDashboard, HeartHandshake, LogOut, Bell, Settings, MessageSquare, Search, Building2, UserCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationDrawer } from "./ui/NotificationDrawer";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { subscribeToConversations } from "@/lib/chat";

export const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Track unread notifications
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  React.useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid),
      where("read", "==", false)
    );
    const unsubscribeNotifs = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    }, (err) => console.error("Navbar notifications listener error:", err));

    const unsubscribeChat = subscribeToConversations(user.uid, (convs) => {
      let count = 0;
      convs.forEach(c => {
        count += c.unreadCount?.[user.uid] || 0;
      });
      setChatUnreadCount(count);
    }, (err) => console.error("Navbar chat listener error:", err));

    return () => {
      unsubscribeNotifs();
      unsubscribeChat();
    };
  }, [user?.uid]);


  const navLinks = (profile?.role === "ngo") ? [
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { name: "Post Need", href: "/post-need", icon: <HeartHandshake size={18} /> },
    { name: "Groups", href: "/groups", icon: <Users size={18} /> },
    { name: "Volunteers", href: "/volunteers", icon: <UserCircle size={18} /> },
  ] : profile?.role === "volunteer" ? [
    { name: "Search", href: "/volunteer", icon: <Search size={18} /> },
    { name: "NGOs", href: "/ngos", icon: <Building2 size={18} /> },
    { name: "My Groups", href: "/my-groups", icon: <Users size={18} /> },
    { name: "Messages", href: "/messages", icon: <MessageSquare size={18} /> },
  ] : [];

  return (
    <>
      <nav className="bg-white border-b border-[#E5E3DB] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
                  <HeartHandshake className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-primary-dark">NeedMap</span>
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary-light text-primary"
                      : "text-text-secondary hover:bg-gray-50 hover:text-foreground"
                  )}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
              
              {user ? (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
                  {/* Messages Bubble */}
                  <Link href="/messages" className="relative p-2 text-text-secondary hover:text-primary transition-colors">
                    <MessageSquare size={20} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Notification Bell */}
                  <button 
                    onClick={() => setDrawerOpen(true)}
                    className="relative p-2 text-text-secondary hover:text-primary transition-colors"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>

                  <Link href={`/${profile?.role === 'ngo' ? 'ngo' : 'volunteer'}/${profile?.uid}`} className="flex items-center gap-2 hover:bg-gray-50 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-[#E5E3DB]">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                      {profile?.profileImage ? (
                        <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-light flex items-center justify-center text-xs font-bold text-primary">
                          {profile?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                  </Link>


                  <Link href="/settings" className="p-2 text-text-secondary hover:text-gray-800 transition-colors" title="Settings">
                    <Settings size={18} />
                  </Link>
                  
                  <button
                    onClick={logout}
                    className="p-2 text-text-secondary hover:text-danger hover:bg-red-50 rounded-full transition-colors"
                    title="Log out"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-4">
                  <Link href="/auth" className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light rounded-md transition-colors">
                    Log in
                  </Link>
                  <Link href="/auth" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition-colors shadow-sm">
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-3">
              {user && (
                <>
                  <Link href="/messages" className="relative p-2 text-text-secondary">
                    <MessageSquare size={20} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] font-bold text-white">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </Link>
                  <button 
                    onClick={() => setDrawerOpen(true)}
                    className="relative p-2 text-text-secondary"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-text-secondary hover:text-foreground rounded-md transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E3DB] bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium",
                    pathname === link.href
                      ? "bg-primary-light text-primary"
                      : "text-text-secondary hover:bg-gray-50 hover:text-foreground"
                  )}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
              
              {user ? (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Link href={`/${profile?.role === 'ngo' ? 'ngo' : 'volunteer'}/${profile?.uid}`} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2">
                     <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                      {profile?.profileImage ? (
                        <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
                          {profile?.name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{profile?.name}</p>
                    </div>
                  </Link>

                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-base font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                    <Settings size={20} /> Settings
                  </Link>


                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-base font-medium text-danger hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut size={20} />
                    Log out
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2 px-3">
                  <Link 
                    href="/auth" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-4 py-2 text-base font-medium text-primary border border-primary rounded-md"
                  >
                    Log in
                  </Link>
                  <Link 
                    href="/auth" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center px-4 py-2 text-base font-medium text-white bg-primary rounded-md"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
      


      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};
