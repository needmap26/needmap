"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { UrgencyBadge } from "@/components/ui/UrgencyBadge";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { Need, NeedStatus } from "@/types";
import { Plus, ListTodo, AlertCircle, Clock, CheckCircle, Eye } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activeTab, setActiveTab] = useState<NeedStatus | "all">("all");

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, "needs"),
      where("postedBy", "==", profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Need[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Need[];

        // 🔥 Prevent unnecessary re-renders
        setNeeds(prev => {
          const newData = docs.sort((a, b) => b.createdAt - a.createdAt);

          if (JSON.stringify(prev) === JSON.stringify(newData)) {
            return prev; // no update → no re-render
          }

          return newData;
        });
      },
      (error) => {
        console.error("Dashboard needs listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: needs.length,
      open: needs.filter(n => n.status === "open").length,
      inProgress: needs.filter(n => n.status === "in_progress").length,
      resolvedThisMonth: needs.filter(n => {
        if (n.status !== "resolved" || !n.resolvedAt) return false;
        const d = new Date(n.resolvedAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length
    };
  }, [needs]);

  const filteredNeeds = useMemo(() => {
    if (activeTab === "all") return needs;
    return needs.filter(n => n.status === activeTab);
  }, [needs, activeTab]);

  const tabs: { id: NeedStatus | "all"; label: string }[] = [
    { id: "all", label: "All Needs" },
    { id: "open", label: "Open" },
    { id: "in_progress", label: "In Progress" },
    { id: "resolved", label: "Resolved" },
  ];

  return (
    <ProtectedRoute allowedRoles={["ngo_admin"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-foreground">NGO Dashboard</h1>
              <p className="text-text-secondary mt-1">Manage and track your community needs.</p>
            </div>
            <Link
              href="/post-need"
              className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center gap-2"
            >
              <Plus size={20} /> Post New Need
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Needs Posted" value={stats.total} icon={<ListTodo size={24} />} />
            <StatCard title="Open Needs" value={stats.open} icon={<AlertCircle size={24} />} />
            <StatCard title="In Progress" value={stats.inProgress} icon={<Clock size={24} />} />
            <StatCard title="Resolved This Month" value={stats.resolvedThisMonth} icon={<CheckCircle size={24} />} />
          </div>

          <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden">
            <div className="border-b border-[#E5E3DB]">
              <div className="flex overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary hover:text-foreground hover:border-gray-300"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredNeeds.length === 0 ? (
              <EmptyState
                title={`No ${activeTab !== 'all' ? activeTab.replace('_', ' ') : ''} needs found`}
                description={activeTab === 'all' ? "You haven't posted any needs yet. Click the 'Post New Need' button above to get started." : "Try changing the filter tab."}
                className="my-8 mx-8 border-dashed"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E5E3DB] text-xs uppercase tracking-wider text-text-secondary">
                      <th className="px-6 py-3 font-semibold">Title & Date</th>
                      <th className="px-6 py-3 font-semibold">Category</th>
                      <th className="px-6 py-3 font-semibold">Urgency</th>
                      <th className="px-6 py-3 font-semibold">Location</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DB]">
                    {filteredNeeds.map((need) => (
                      <tr key={need.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-foreground max-w-xs truncate" title={need.title}>
                            {need.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-1">
                            {format(need.createdAt, "MMM d, yyyy")}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <CategoryBadge category={need.category} />
                        </td>
                        <td className="px-6 py-4">
                          <UrgencyBadge level={need.priority || need.urgencyLabel || "medium"} />
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate" title={need.location.address}>
                          {need.location.city}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${need.status === 'open' ? 'bg-red-50 text-red-700' :
                              need.status === 'in_progress' ? 'bg-orange-50 text-orange-700' :
                                'bg-green-50 text-green-700'
                            }`}>
                            {need.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 text-sm font-medium">
                            <Eye size={16} /> <span className="hidden sm:inline">Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
