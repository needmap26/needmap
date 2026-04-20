"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (profile) {
        router.push(profile.role === "ngo_admin" ? "/dashboard" : "/volunteer");
      } else {
        router.push("/complete-profile");
      }
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );
}
