"use client";

import React from "react";
import { ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { NearbyNGOs } from "@/components/NearbyNGOs";

export default function NGOsPage() {
  return (
    <ProtectedRoute allowedRoles={["volunteer"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9] pb-24 md:pb-0">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">NGOs Near You</h1>
            <p className="text-sm sm:text-base text-text-secondary mt-1">
              Discover and connect with local organizations making an impact.
            </p>
          </div>
          
          <section className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm">
            <NearbyNGOs />
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
