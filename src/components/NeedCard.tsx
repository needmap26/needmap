"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation } from "@/lib/chat";
import { Need, UrgencyLabel } from "@/types";
import { UrgencyBadge } from "./ui/UrgencyBadge";
import { CategoryBadge } from "./ui/CategoryBadge";
import { MapPin, Users, CheckCircle, MessageSquare, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NeedCardProps {
  need: Need;
  onAction?: (needId: string) => void;
  actionLabel?: string;
  onNavigate?: (need: Need) => void;
  isActiveNavigate?: boolean;
}

export const NeedCard = ({ need, onAction, actionLabel, onNavigate, isActiveNavigate }: NeedCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingChat, setLoadingChat] = useState(false);

  const handleMessageNGO = async () => {
    if (!user || !need.postedBy) return;
    setLoadingChat(true);
    try {
      const convId = await getOrCreateConversation(
        user,
        { uid: need.postedBy, name: need.ngoName, role: 'ngo_admin' },
        need.id
      );
      router.push(`/messages/${convId}`);
    } catch (error) {
      console.error("Failed to start chat", error);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-foreground line-clamp-2">{need.title}</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <UrgencyBadge level={need.priority as UrgencyLabel || "medium"} />
          <CategoryBadge category={need.category} />
        </div>

        <p className="text-text-secondary text-sm mb-4 line-clamp-3">
          {need.description}
        </p>

        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-primary" />
            <span className="truncate">{need.location.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <span>{need.peopleAffected} people affected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
              {need.ngoName?.charAt(0) || 'N'}
            </div>
            <span className="truncate">{need.ngoName || 'Unknown NGO'} {need.contactNumber ? `• ${need.contactNumber}` : ''}</span>
          </div>
        </div>
        
        {need.requiredSkills && need.requiredSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E5E3DB]">
            <p className="text-xs font-semibold text-foreground mb-2">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {need.requiredSkills.map(skill => (
                <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-[#E5E3DB] flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          Posted {formatDistanceToNow(need.createdAt)} ago
        </span>
        
        <div className="flex gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate(need)}
              className={`p-2 border rounded-lg transition-colors shadow-sm flex items-center justify-center ${
                isActiveNavigate 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
              title="In-App Navigation"
            >
              <Navigation size={16} />
            </button>
          )}
          
          <button
            onClick={() => {
              if (need.location?.lat && need.location?.lng) {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${need.location.lat},${need.location.lng}`, '_blank');
              }
            }}
            className="p-2 px-3 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1 text-sm font-medium"
            title="Navigate in Google Maps"
          >
            Navigate 🚀
          </button>

          {user && user.uid !== need.postedBy && need.status !== 'resolved' && (
            <button
              onClick={handleMessageNGO}
              disabled={loadingChat}
              className="p-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              title="Message NGO"
            >
              {loadingChat ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MessageSquare size={16} />}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              onClick={() => need.id && onAction(need.id)}
              disabled={need.status === 'resolved'}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {need.status === 'resolved' && <CheckCircle size={16} />}
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
