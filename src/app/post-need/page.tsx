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
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";

const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const PlacesAutocomplete = ({ onPlaceSelect }: { onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void }) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;
    
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "name", "address_components"],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      setInputValue(place.formatted_address || place.name || "");
      onPlaceSelect(place);
    });
  }, [places, onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      required
      placeholder="Start typing to search address..."
      className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
    />
  );
};

const PostNeedForm = () => {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<NeedCategory>("food");
  const [contactNumber, setContactNumber] = useState("");
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  
  // Location
  const [locationRaw, setLocationRaw] = useState<google.maps.places.PlaceResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return toast.error("Not authenticated");
    if (!locationRaw?.geometry?.location) return toast.error("Please select a valid address from the dropdown");
    
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
      console.log("Gemini AI Analysis Result:", analysis);
      if (!res.ok) {
        console.warn("AI Analysis failed, using fallbacks:", analysis.error);
        // We don't throw here, we use the fallback values provided in the response
      }

      toast.loading("Saving need to database...", { id: toastId });

      // 2. Extract location details
      const lat = locationRaw.geometry.location.lat();
      const lng = locationRaw.geometry.location.lng();
      const address = locationRaw.formatted_address || "";
      
      let city = "";
      locationRaw.address_components?.forEach(component => {
        if (component.types.includes("locality") || component.types.includes("administrative_area_level_2")) {
          city = component.long_name;
        }
      });
      if (!city) city = "Unknown";

      // 3. Save to Firestore
      const newNeed = {
        title,
        description,
        category: analysis.category || category,
        priority: analysis.priority || "medium",
        isEmergency: analysis.priority === "critical",
        location: { lat, lng, address, city },
        status: "pending",
        postedBy: profile.uid,
        ngoName: profile.ngoName || "Unknown NGO",
        contactNumber,
        assignedVolunteer: null,
        createdAt: Date.now(),
        peopleAffected,
        requiredSkills: requiredSkills.length > 0 ? requiredSkills : [],
      };

      const docRef = await addDoc(collection(db, "needs"), newNeed);
      console.log("Firestore Write Success! ID:", docRef.id);
      
      toast.success("Need posted successfully!", { id: toastId });
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
            className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-foreground mb-1">Category</label>
          <select
            className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
            className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
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
            className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">Location Address</label>
            <PlacesAutocomplete onPlaceSelect={setLocationRaw} />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-1">People Affected</label>
            <input
              type="number"
              min={1}
              required
              className="w-full px-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={peopleAffected}
              onChange={(e) => setPeopleAffected(parseInt(e.target.value))}
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
    <ProtectedRoute allowedRoles={["ngo_admin"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />
        <APIProvider apiKey={mapsApiKey} libraries={['places']}>
          <PostNeedForm />
        </APIProvider>
      </div>
    </ProtectedRoute>
  );
}
