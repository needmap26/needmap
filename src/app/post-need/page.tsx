"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { SkillSelector } from "@/components/ui/SkillSelector";
import { NeedCategory } from "@/types";
import toast from "react-hot-toast";
import { NominatimSearch, LocationData } from "@/components/NominatimSearch";
const PostNeedForm = () => {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<NeedCategory>("food");
  const [contactNumber, setContactNumber] = useState("");
  const [peopleAffected, setPeopleAffected] = useState<number | "">(1);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  
  // Location
  const [locationRaw, setLocationRaw] = useState<LocationData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return toast.error("Not authenticated");
    if (!locationRaw) return toast.error("Please select a valid address from the dropdown");
    
    setLoading(true);
    const toastId = toast.loading("Analyzing need with AI...");

    try {
      // 1. Call Gemini analysis
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      
      const analysis = await res.json();
      if (!res.ok) {
        console.warn("AI Analysis failed, using fallbacks:", analysis.error);
        // We don't throw here, we use the fallback values provided in the response
      }

      toast.loading("Saving need to database...", { id: toastId });

      // 2. Extract location details
      const lat = locationRaw.lat;
      const lng = locationRaw.lng;
      const address = locationRaw.address || "";
      const city = locationRaw.city || "Unknown";

      // 3. Save to Firestore
      const newNeed = {
        title,
        description,
        category: analysis.category || category,
        priority: analysis.urgency || "medium",
        isEmergency: analysis.urgency === "high" || analysis.urgency === "critical",
        priorityScore: analysis.priorityScore || 50,
        keywords: analysis.keywords || [],
        suggestedAction: analysis.suggestedAction || "",
        aiClassified: true,
        location: { lat, lng, address, city },
        status: "open",
        postedBy: profile.uid,
        ngoName: profile.ngoName || "Unknown NGO",
        contactNumber,
        assignedVolunteer: null,
        createdAt: Date.now(),
        peopleAffected: peopleAffected || 1,
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : [],
      };

      const docRef = await addDoc(collection(db, "needs"), newNeed);
      
      toast.success("Need posted successfully!", { id: toastId });
      
      // Clear form after submission
      setTitle("");
      setDescription("");
      setCategory("food");
      setContactNumber("");
      setPeopleAffected(1);
      setRequiredSkills([]);
      
      router.push("/dashboard");
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(error);
      toast.error(error.message || "Failed to post need", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-foreground">Post a Community Need</h1>
        <p className="text-text-secondary mt-2">Provide details about the crisis. Our AI will prioritize it automatically.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl border border-[#E5E3DB] shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Need Title</label>
          <input
            type="text"
            required
            maxLength={100}
            placeholder="E.g. Emergency Food Supply Needed"
            className="w-full px-4 py-3 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Category</label>
          <select
            className="w-full px-4 py-3 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value as NeedCategory)}
          >
            <option value="food">Food</option>
            <option value="medical">Medical</option>
            <option value="shelter">Shelter</option>
            <option value="education">Education</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Detailed Description</label>
          <p className="text-xs text-text-secondary mb-2">Be specific. Gemini AI will analyze this for urgency.</p>
          <textarea
            required
            rows={4}
            className="w-full px-4 py-3 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Contact Number</label>
          <input
            type="tel"
            required
            placeholder="E.g. +1 234 567 8900"
            className="w-full px-4 py-3 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Location Address</label>
            <NominatimSearch onLocationSelect={setLocationRaw} />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">People Affected</label>
            <input
              type="number"
              min={1}
              required
              className="w-full px-4 py-3 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={peopleAffected ?? ""}
              onChange={(e) => setPeopleAffected(e.target.value ? Number(e.target.value) : "")}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Required Skills (Optional)</label>
          <p className="text-xs text-text-secondary mb-2">Select any specific skills volunteers need. If left empty, AI will suggest them.</p>
          <SkillSelector selectedSkills={requiredSkills} onChange={setRequiredSkills} />
        </div>

        <div className="pt-4 border-t border-[#E5E3DB]">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white text-lg font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-md disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Submit Need & Analyze"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function PostNeedPage() {
  return (
    <ProtectedRoute allowedRoles={["ngo"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />
        <PostNeedForm />
      </div>
    </ProtectedRoute>
  );
}
