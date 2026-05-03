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
  const [role, setRole] = useState<UserRole>((searchParams.get("role") as string) === "ngo_admin" ? "ngo" : (searchParams.get("role") as UserRole) || "volunteer");
  
  // Form fields
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [ngoName, setNgoName] = useState("");
  const [bio, setBio] = useState("");
  
  // NGO extra fields
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [achievements, setAchievements] = useState("");
  const [services, setServices] = useState("");

  // Images
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
    // Only redirect AWAY if they are an NGO and already have an NGO profile,
    // OR if they are a volunteer and have all required fields.
    if (!authLoading && profile) {
      if (profile.role === "ngo" && !profile.hasNgoProfile) {
        // Stay here
        setRole("ngo");
        if (user?.email && !contactEmail) setContactEmail(user.email);
        if (user?.displayName && !name) setName(user.displayName);
      } else if (profile.role === "volunteer" && (!profile.name || !profile.location || !profile.phone)) {
        // Stay here
        setRole("volunteer");
        if (user?.email && !contactEmail) setContactEmail(user.email);
        if (user?.displayName && !name) setName(user.displayName);
      } else {
        router.push(profile.role === "ngo" ? "/dashboard" : "/volunteer");
      }
    } else if (user && !contactEmail) {
       setContactEmail(user.email || "");
       setName(user.displayName || "");
    }
  }, [user, profile, authLoading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover" | "gallery") => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === "logo") {
        const file = e.target.files[0];
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      } else if (type === "cover") {
        const file = e.target.files[0];
        setCoverImageFile(file);
        setCoverImagePreview(URL.createObjectURL(file));
      } else if (type === "gallery") {
        const files = Array.from(e.target.files);
        setGalleryFiles(prev => [...prev, ...files]);
        const previews = files.map(f => URL.createObjectURL(f));
        setGalleryPreviews(prev => [...prev, ...previews]);
      }
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { uploadImage } = await import("@/lib/storage");
      
      let profileImage = "";
      if (imageFile) {
        profileImage = await uploadProfileImage(imageFile, user.uid);
      }

      let coverImageUrl = "";
      if (coverImageFile) {
         coverImageUrl = await uploadImage(coverImageFile, `profiles/${user.uid}/cover_${Date.now()}`);
      }

      const galleryUrls: string[] = [];
      for (const file of galleryFiles) {
         const url = await uploadImage(file, `profiles/${user.uid}/gallery/${file.name}_${Date.now()}`);
         galleryUrls.push(url);
      }

      const userData: Record<string, any> = {
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
        userData.phone = phone || "";
        userData.location = { lat: 0, lng: 0, city }; // Ideally get real lat/lng, using 0 for now
        userData.coins = 0;
        userData.level = "Newcomer";
        userData.badges = ["NeedMap Pioneer"];
        userData.totalTasksCompleted = 0;
        userData.totalHoursLogged = 0;
        userData.joinedAt = Date.now();
      } else {
        userData.ngoName = ngoName;
        userData.address = city;
        userData.verified = false;
        userData.totalNeedsPosted = 0;
        userData.totalResolved = 0;
        if (coverImageUrl) userData.coverImage = coverImageUrl;
        userData.phone = phone;
        userData.hasNgoProfile = true;
      }

      await setDoc(doc(db, "users", user.uid), userData);
      
      if (role === "ngo") {
        const servicesArray = services.split(",").map(s => s.trim()).filter(s => s);
        await setDoc(doc(db, "ngos", user.uid), {
          uid: user.uid,
          name: ngoName,
          description: bio,
          location: city,
          contactEmail,
          phone: phone || null,
          teamSize: teamSize ? parseInt(teamSize) : null,
          achievements,
          services: servicesArray,
          logoUrl: profileImage || null,
          coverImageUrl: coverImageUrl || null,
          gallery: galleryUrls,
          createdAt: Date.now()
        });
      }
      
      // Award 50 coins for completing profile
      if (role === "volunteer") {
        await awardCoins(user.uid, 50, "Sign up and complete profile");
      }

      toast.success(role === "ngo" ? "NGO profile created successfully" : "Profile completed successfully!");
      router.push(role === "ngo" ? "/dashboard" : "/volunteer");
      
      // Force refresh to reload auth context profile & global states
      window.location.reload();
    } catch (error: unknown) {
      toast.error((error as Error).message || "An error occurred saving your profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div></div>;

  return (
    <div className="max-w-2xl w-full bg-white p-8 rounded-2xl shadow-xl border border-[#E5E3DB] my-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-foreground">{role === 'ngo' ? 'Complete NGO Profile' : 'Complete Your Profile'}</h2>
        <p className="text-text-secondary mt-2">Just a few more details to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            onClick={() => setRole("ngo")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${role === "ngo" ? "bg-white text-primary shadow-sm" : "text-text-secondary"}`}
          >
            NGO Admin
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <label className="block text-sm font-medium text-foreground mb-2 text-center w-full">{role === 'ngo' ? 'NGO Logo' : 'Profile Photo'}</label>
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
              onChange={(e) => handleImageChange(e, "logo")} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {role === "ngo" && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Cover Image (Optional)</label>
            <div className="relative cursor-pointer group w-full h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
              {coverImagePreview ? (
                <img src={coverImagePreview} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Upload Cover Image</span>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleImageChange(e, "cover")} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {role === "ngo" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">NGO Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={ngoName}
              onChange={(e) => setNgoName(e.target.value)}
              placeholder="E.g. Red Cross Society"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{role === "ngo" ? "Admin Full Name *" : "Full Name *"}</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={user.displayName || "e.g. John Doe"}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{role === "ngo" ? "NGO Description *" : "Bio"}</label>
          <textarea
            required={role === "ngo"}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={role === 'volunteer' ? 200 : 800}
            placeholder={role === 'volunteer' ? "Why do you volunteer?" : "Describe your NGO's mission, vision, and core activities..."}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{role === "ngo" ? "Headquarters Location / City *" : "City *"}</label>
          <input
            type="text"
            required
            placeholder="E.g. New York, London, Mumbai"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        {role === "ngo" && (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Contact Email *</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="info@ngo.org"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{role === "ngo" ? "Phone Number (Optional)" : "Phone Number *"}</label>
                <input
                  type="tel"
                  required={role === "volunteer"}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Team Size (Optional)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="E.g. 15"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Services Provided (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="E.g. Food Distribution, Medical Aid (comma separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Achievements (Optional)</label>
              <textarea
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                rows={2}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder="List any notable achievements, awards, or impact metrics."
              />
            </div>

            <div>
               <label className="block text-sm font-medium text-foreground mb-2">Gallery Images (Optional)</label>
               <input 
                 type="file" 
                 accept="image/*" 
                 multiple
                 onChange={(e) => handleImageChange(e, "gallery")} 
                 className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary/20 cursor-pointer"
               />
               {galleryPreviews.length > 0 && (
                 <div className="mt-4 flex flex-wrap gap-2">
                   {galleryPreviews.map((src, idx) => (
                     <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border">
                       <img src={src} alt="Gallery" className="w-full h-full object-cover" />
                       <button 
                         type="button" 
                         onClick={() => removeGalleryImage(idx)} 
                         className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs"
                       >
                         ✕
                       </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </>
        )}

        {role === "volunteer" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone Number *</label>
            <input
              type="tel"
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        )}

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
          className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center mt-8"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving Profile...</span>
            </div>
          ) : "Save & Continue"}
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
