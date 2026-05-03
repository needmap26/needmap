"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquare, Users, Shield } from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeletons";

export default function MyGroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch groups where the volunteer is a member
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <ProtectedRoute allowedRoles={["volunteer"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">My Groups</h1>
            <p className="text-text-secondary mt-1">Manage and access the groups you've joined.</p>
          </div>

          {loading ? (
            <DashboardSkeleton />
          ) : groups.length === 0 ? (
            <EmptyState
              title="You haven't joined any groups yet"
              description="Explore NGOs and request to join their groups to collaborate with other volunteers."
              className="bg-white border border-[#E5E3DB] shadow-sm rounded-xl py-12"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground leading-tight">{group.groupName}</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mt-1">
                          <Shield size={12} className="text-primary" /> {group.ngoName || "NGO"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-6 mt-auto">
                    <Users size={16} />
                    <span>{group.members?.length || 0} members</span>
                  </div>

                  <div className="pt-4 border-t border-[#E5E3DB]">
                    <Link
                      href={`/groups/${group.id}`}
                      className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={18} /> Open Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
