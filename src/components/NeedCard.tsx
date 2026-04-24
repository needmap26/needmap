"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation } from "@/lib/chat";
import { Need, UrgencyLabel } from "@/types";
import { UrgencyBadge } from "./ui/UrgencyBadge";
import { CategoryBadge } from "./ui/CategoryBadge";
import { MapPin, Users, CheckCircle, MessageSquare, Navigation, Sparkles, AlertTriangle, Lightbulb } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/ui/Skeletons";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { 
  ssr: false,
  loading: () => <MapSkeleton />
});

interface NeedCardProps {
  need: Need;
  onAction?: (needId: string) => void;
  actionLabel?: string;
  onNavigate?: (need: Need) => void;
  isActiveNavigate?: boolean;
  isActionLoading?: boolean;
}

export const NeedCard = ({ need, onAction, actionLabel, onNavigate, isActiveNavigate, isActionLoading }: NeedCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingChat, setLoadingChat] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  const handleMessageNGO = async () => {
    if (!user || !need.postedBy) return;
    setLoadingChat(true);
    try {
      const convId = await getOrCreateConversation(
        user,
        { uid: need.postedBy, name: need.ngoName, role: 'ngo' },
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
    <>
    <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden flex flex-col h-full hover:-translate-y-1 hover:shadow-md transition-all duration-300">
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-foreground line-clamp-2">{need.title}</h3>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <UrgencyBadge level={need.priority as UrgencyLabel || "medium"} />
          <CategoryBadge category={need.category} />
          {need.aiClassified && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-100 text-purple-700">
              <Sparkles size={10} /> AI Classified
            </span>
          )}
          {need.priorityScore && need.priorityScore >= 80 && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700">
              <AlertTriangle size={10} /> High Priority
            </span>
          )}
        </div>

        <p className="text-text-secondary text-sm mb-4 line-clamp-3">
          {need.description}
        </p>

        {need.suggestedAction && (
          <div className="mb-4 bg-purple-50 border border-purple-100 p-3 rounded-lg">
            <p className="text-xs font-bold text-purple-800 flex items-center gap-1 mb-1">
              <Lightbulb size={12} /> Suggested Action (AI)
            </p>
            <p className="text-sm text-purple-900">{need.suggestedAction}</p>
          </div>
        )}

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
          
          <button
            onClick={() => {
              if (need.location?.lat && need.location?.lng) {
                setShowMapModal(true);
              } else {
                toast.error("Location data missing for this need.");
              }
            }}
            className="py-2.5 px-4 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 active:scale-[0.98] transition-all shadow-sm flex items-center gap-1 text-sm font-medium"
            title="View Location"
          >
            View Location
          </button>



          {user && user.uid !== need.postedBy && need.status !== 'completed' && (
            <button
              onClick={handleMessageNGO}
              disabled={loadingChat}
              className="p-2.5 px-3 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
              title="Message NGO"
            >
              {loadingChat ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MessageSquare size={16} />}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              onClick={() => need.id && onAction(need.id)}
              disabled={need.status === 'completed' || isActionLoading}
              className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {need.status === 'completed' ? <CheckCircle size={16} /> : null}
              {isActionLoading ? "Loading..." : actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>

    {showMapModal && need.location?.lat && need.location?.lng && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-2xl h-[100dvh] md:h-[500px] flex flex-col overflow-hidden relative">
          <div className="p-4 border-b bg-white z-10 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <MapPin size={20} className="text-primary" /> Location Details
              </h3>
              <button onClick={() => setShowMapModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition-colors">
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg border border-[#E5E3DB]">
              <div>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Full Address</p>
                <p className="text-foreground font-medium">{need.location.address || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-1">Area / City</p>
                <p className="text-foreground font-medium">{need.location.city || "Not provided"}</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 relative z-0">
            <LeafletMap 
              need={need}
            />
          </div>

          <div className="p-4 border-t bg-white flex justify-between items-center z-10">
            <p className="text-xs font-mono text-text-secondary">
              {need.location.lat.toFixed(6)}, {need.location.lng.toFixed(6)}
            </p>
            <a 
              href={`https://www.google.com/maps?q=${need.location.lat},${need.location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all font-bold text-sm shadow-sm"
            >
              <Navigation size={16} /> Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
