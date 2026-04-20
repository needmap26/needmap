"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation } from "@/lib/chat";
import { Task, Need } from "@/types";
import { CheckCircle, Clock, FileText, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { UrgencyBadge } from "./ui/UrgencyBadge";

interface TaskCardProps {
  task: Task;
  need?: Need;
  onComplete: (taskId: string, notes: string) => void;
}

export const TaskCard = ({ task, need, onComplete }: TaskCardProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [loadingChat, setLoadingChat] = useState(false);
  const [notes, setNotes] = React.useState("");

  const handleMessage = async () => {
    if (!user || !need) return;
    setLoadingChat(true);
    try {
      const isNGO = user.uid === need.postedBy;
      const otherUser = isNGO 
        ? { uid: task.volunteerId, name: task.volunteerName || 'Volunteer', role: 'volunteer' }
        : { uid: need.postedBy, name: need.ngoName, role: 'ngo_admin' };
        
      const convId = await getOrCreateConversation(user, otherUser, need.id);
      router.push(`/messages/${convId}`);
    } catch (error) {
      console.error("Failed to start chat", error);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden flex flex-col">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-foreground">
            {need?.title || "Unknown Task"}
          </h3>
          {task.status === "completed" ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary-light px-2 py-1 rounded-full">
              <CheckCircle size={14} /> Completed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-accent bg-orange-50 px-2 py-1 rounded-full">
              <Clock size={14} /> In Progress
            </span>
          )}
        </div>

        {need && (
          <div className="mt-2 text-sm text-text-secondary">
            <p className="flex items-center gap-2 mb-1">
               <span className="font-semibold text-foreground">NGO:</span> {need.ngoName}
            </p>
            <p className="flex items-center gap-2 mb-2">
               <span className="font-semibold text-foreground">Location:</span> {need.location.address}
            </p>
            <UrgencyBadge level={need.priority || need.urgencyLabel || "medium"} />
          </div>
        )}

        {task.status === "in_progress" && (
          <div className="mt-4 pt-4 border-t border-[#E5E3DB]">
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <FileText size={16} /> Completion Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go? Any follow-up needed?"
              className="w-full h-20 p-3 text-sm border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <button
              onClick={() => task.id && onComplete(task.id, notes)}
              className="mt-3 w-full py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm flex justify-center items-center gap-2"
            >
              <CheckCircle size={18} /> Mark Complete
            </button>
          </div>
        )}

        {task.status === "completed" && task.notes && (
          <div className="mt-4 pt-4 border-t border-[#E5E3DB]">
            <p className="text-xs font-semibold text-foreground mb-1">Your Notes:</p>
            <p className="text-sm text-text-secondary bg-gray-50 p-3 rounded-lg border border-[#E5E3DB] italic">
              &quot;{task.notes}&quot;
            </p>
          </div>
        )}
      </div>
      <div className="px-5 py-3 bg-gray-50 border-t border-[#E5E3DB] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">Accepted: {formatDistanceToNow(task.acceptedAt)} ago</span>
          {task.completedAt && (
            <span className="text-xs text-text-secondary">Completed: {formatDistanceToNow(task.completedAt)} ago</span>
          )}
        </div>
        
        {user && need && (
          <button
            onClick={handleMessage}
            disabled={loadingChat}
            className="w-full py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex justify-center items-center gap-2 mt-2"
          >
            {loadingChat ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div> : <MessageSquare size={16} />}
            {user.uid === need?.postedBy ? 'Message Volunteer' : 'Message NGO'}
          </button>
        )}
      </div>
    </div>
  );
};
