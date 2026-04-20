"use client";

import React, { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { awardCoins } from "@/lib/rewards";
import { Star, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  volunteerId: string;
  volunteerName?: string;
  onSuccess?: () => void;
}

export function RatingModal({ isOpen, onClose, taskId, volunteerId, volunteerName, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return toast.error("Please select a rating.");
    setLoading(true);

    try {
      // 1. Update task with rating & feedback
      await updateDoc(doc(db, "tasks", taskId), {
        rating,
        feedback
      });

      // 2. Fetch volunteer to update average rating
      const volRef = doc(db, "users", volunteerId);
      const volSnap = await getDoc(volRef);
      if (volSnap.exists()) {
        const data = volSnap.data();
        const currentAvg = data.rating || 0;
        const totalRatings = data.totalRatings || 0;
        
        const newTotalRatings = totalRatings + 1;
        const newAvg = ((currentAvg * totalRatings) + rating) / newTotalRatings;

        await updateDoc(volRef, {
          rating: newAvg,
          totalRatings: newTotalRatings
        });
      }

      // 3. Award coins if 5-star
      if (rating === 5) {
        await awardCoins(volunteerId, 75, "Received a 5-star rating from an NGO");
      }

      toast.success("Rating submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to submit rating.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-800 transition-colors">
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-foreground">Rate Volunteer</h2>
          <p className="text-text-secondary text-sm mt-1">
            How did {volunteerName || 'the volunteer'} do?
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6 cursor-pointer">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={36}
              className={`transition-colors ${
                star <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
            />
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1">Feedback (Optional)</label>
          <textarea
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none bg-gray-50 text-sm"
            rows={3}
            maxLength={100}
            placeholder="Write a brief review..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          ></textarea>
          <div className="text-right text-xs text-gray-400 mt-1">{feedback.length}/100</div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}
