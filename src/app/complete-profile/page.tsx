"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { awardCoins } from "@/lib/rewards";
import { uploadProfileImage } from "@/lib/storage";
import { UserRole } from "@/types";
import { Navbar } from "@/components/Navbar";
import { SkillSelector } from "@/components/ui/SkillSelector";
import toast from "react-hot-toast";

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>((searchParams.get("role") as UserRole) || "volunteer");
  
  // Form fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [ngoName, setNgoName] = useState("");
  const [bio, setBio] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
    // If they already have a profile, redirect to dashboard/volunteer
    if (!authLoading && profile) {
      router.push(profile.role === "ngo_admin" ? "/dashboard" : "/volunteer");
    }
  }, [user, profile, authLoading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let profileImage = "";
      if (imageFile) {
        profileImage = await uploadProfileImage(imageFile, user.uid);
      }

      const userData: Record<string, unknown> = {
        uid: user.uid,
        email: user.email || user.phoneNumber || "",
        name: name || user.displayName || "Unknown",
        role,
        createdAt: Date.now(),
        profileImage,
        bio
      };

      if (role === "volunteer") {
        userData.skills = skills;
        userData.city = city;
        userData.location = { lat: 0, lng: 0, city };
        userData.coins = 0;
        userData.level = "Newcomer";
        userData.badges = [];
        userData.totalTasksCompleted = 0;
        userData.totalHoursLogged = 0;
        userData.joinedAt = Date.now();
      } else {
        userData.ngoName = ngoName;
        userData.address = city;
        userData.verified = false;
        userData.totalNeedsPosted = 0;
        userData.totalResolved = 0;
      }

      await setDoc(doc(db, "users", user.uid), userData);
      
      // Award 50 coins for completing profile
      if (role === "volunteer") {
        await awardCoins(user.uid, 50, "Sign up and complete profile");
      }

      toast.success("Profile completed successfully!");
      router.push(role === "ngo_admin" ? "/dashboard" : "/volunteer");
      // Force refresh to reload auth context profile
      window.location.reload();
    } catch (error: unknown) {
      toast.error((error as Error).message || "An error occurred saving your profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div></div>;

  return (
    <div className="max-w-xl w-full bg-white p-8 rounded-2xl shadow-xl border border-[#E5E3DB] my-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-foreground">Complete Your Profile</h2>
        <p className="text-text-secondary mt-2">Just a few more details to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center mb-6">
          <label className="block text-sm font-medium text-foreground mb-2 text-center w-full">Profile Photo</label>
          <div className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Upload</span>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              capture="user"
              onChange={handleImageChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-1 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setRole("volunteer")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${role === "volunteer" ? "bg-white text-primary shadow-sm" : "text-text-secondary"}`}
          >
            Volunteer
          </button>
          <button
            type="button"
            onClick={() => setRole("ngo_admin")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${role === "ngo_admin" ? "bg-white text-primary shadow-sm" : "text-text-secondary"}`}
          >
            NGO Admin
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={user.displayName || "e.g. Harshil Sanmber"}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
          <textarea
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={role === 'volunteer' ? 200 : 300}
            placeholder={role === 'volunteer' ? "Why do you volunteer?" : "NGO Mission Statement"}
          />
        </div>

        {role === "ngo_admin" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">NGO Organization Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={ngoName}
              onChange={(e) => setNgoName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">City</label>
          <input
            type="text"
            required
            placeholder="E.g. New York, London, Mumbai"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {role === "volunteer" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">My Skills</label>
            <SkillSelector 
              selectedSkills={skills} 
              onChange={setSkills} 
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>}>
          <CompleteProfileContent />
        </Suspense>
      </main>
    </div>
  );
}
