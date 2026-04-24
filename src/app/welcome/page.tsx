"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function WelcomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();

  useEffect(() => {
    // Redirect to auth if not logged in after short delay to let context load
    const timeout = setTimeout(() => {
      if (!user) {
        router.push("/auth");
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [user, router]);

  useEffect(() => {
    if (user) {
      const isNgo = profile?.role === "ngo";
      const hasNgoProfile = profile?.hasNgoProfile;

      const timer = setTimeout(() => {
        if (isNgo && !hasNgoProfile) {
          router.push("/complete-profile");
        } else {
          router.push(isNgo ? "/dashboard" : "/volunteer");
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, profile, router]);

  const userName = profile?.name || user?.displayName || "Volunteer";

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-primary text-white animate-in fade-in duration-1000">
      <div className="text-center flex flex-col items-center gap-4">
        <h1 className="text-4xl md:text-5xl font-black mb-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
          WELCOME {userName.toUpperCase()}
        </h1>
        <p className="text-lg md:text-xl font-medium text-emerald-100 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
          Thanks for joining NeedMap
        </p>
        <div className="mt-8 animate-in fade-in duration-1000 delay-300">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
