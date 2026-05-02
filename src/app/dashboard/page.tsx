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
import { DashboardSkeleton } from "@/components/ui/Skeletons";
import { Need, NeedStatus } from "@/types";
import { Plus, ListTodo, AlertCircle, Clock, CheckCircle, Eye, CheckCircle2, Gift, Users as UsersIcon, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { updateDoc, doc, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activeTab, setActiveTab] = useState<NeedStatus | "all">("all");
  const [initialLoading, setInitialLoading] = useState(true);
  const [donations, setDonations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);

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
        setInitialLoading(false);
      },
      (error) => {
        console.warn("Dashboard needs listener error:", error);
      }
    );

    const dQuery = query(
      collection(db, "donations"),
      where("ngoId", "==", profile.uid)
    );
    const unsubscribeDonations = onSnapshot(dQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDonations(docs.sort((a: any, b: any) => b.createdAt - a.createdAt));
    });

    const gQuery = query(
      collection(db, "groups"),
      where("ngoId", "==", profile.uid)
    );
    const unsubscribeGroups = onSnapshot(gQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(docs.sort((a: any, b: any) => b.createdAt - a.createdAt));
    });

    const vQuery = query(collection(db, "users"), where("role", "==", "volunteer"));
    const unsubscribeVolunteers = onSnapshot(vQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVolunteers(docs);
    });

    return () => {
      unsubscribe();
      unsubscribeDonations();
      unsubscribeGroups();
      unsubscribeVolunteers();
    };
  }, [profile?.uid]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: needs.length,
      open: needs.filter(n => n.status === "open").length,
      inProgress: needs.filter(n => n.status === "in_progress").length,
      donationsPending: donations.filter(d => d.status === "PENDING").length
    };
  }, [needs, donations]);

  const filteredNeeds = useMemo(() => {
    if (activeTab === "all") return needs;
    return needs.filter(n => n.status === activeTab);
  }, [needs, activeTab]);

  const handleMarkAsCompleted = async (needId: string) => {
    const toastId = toast.loading("Marking as completed...");
    try {
      await updateDoc(doc(db, "needs", needId), {
        status: "completed",
        resolvedAt: Date.now()
      });
      toast.success("Need marked as completed!", { id: toastId });
    } catch (error) {
      console.warn("Failed to mark need as completed:", error);
      toast.error("Failed to complete need", { id: toastId });
    }
  };

  const handleUpdateDonation = async (donationId: string, status: string) => {
    const toastId = toast.loading(`Marking as ${status.toLowerCase()}...`);
    try {
      await updateDoc(doc(db, "donations", donationId), { status });
      toast.success(`Donation ${status.toLowerCase()}!`, { id: toastId });
    } catch (error) {
      console.warn("Failed to update donation:", error);
      toast.error("Failed to update donation", { id: toastId });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile) return;
    const toastId = toast.loading("Creating group...");
    try {
      await addDoc(collection(db, "groups"), {
        ngoId: profile.uid,
        ngoName: profile.ngoName || profile.name,
        groupName: newGroupName.trim(),
        members: selectedVolunteers,
        createdAt: Date.now()
      });
      setNewGroupName("");
      setSelectedVolunteers([]);
      toast.success("Group created successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to create group", { id: toastId });
    }
  };

  const tabs: { id: NeedStatus | "all"; label: string }[] = [
    { id: "all", label: "All Needs" },
    { id: "open", label: "Open" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <ProtectedRoute allowedRoles={["ngo"]}>
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
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Post New Need
            </Link>
          </div>

          {initialLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Needs Posted" value={stats.total} icon={<ListTodo size={24} />} />
                <StatCard title="Open Needs" value={stats.open} icon={<AlertCircle size={24} />} />
                <StatCard title="In Progress" value={stats.inProgress} icon={<Clock size={24} />} />
                <StatCard title="Pending Donations" value={stats.donationsPending} icon={<Gift size={24} />} />
              </div>

          <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden">
            <div className="border-b border-[#E5E3DB]">
              <div className="flex flex-wrap">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium flex-1 sm:flex-none border-b-2 transition-colors ${activeTab === tab.id
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
                <table className="w-full text-left border-collapse hidden md:table">
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
                          <div className="flex justify-end gap-3">
                            {need.status === 'in_progress' && (
                              <button 
                                onClick={() => need.id && handleMarkAsCompleted(need.id)}
                                className="text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 text-sm font-bold"
                                title="Mark as Completed"
                              >
                                <CheckCircle2 size={16} /> <span>Complete</span>
                              </button>
                            )}
                            <button className="text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 text-sm font-medium">
                              <Eye size={16} /> <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden flex flex-col divide-y divide-[#E5E3DB]">
                  {filteredNeeds.map((need) => (
                    <div key={need.id} className="p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{need.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{format(need.createdAt, "MMM d, yyyy")} • {need.location.city}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <CategoryBadge category={need.category} />
                        <UrgencyBadge level={need.priority || need.urgencyLabel || "medium"} />
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${need.status === 'open' ? 'bg-red-50 text-red-700' :
                            need.status === 'in_progress' ? 'bg-orange-50 text-orange-700' :
                              'bg-green-50 text-green-700'
                          }`}>
                          {need.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex justify-end gap-3 pt-2 border-t border-[#E5E3DB] mt-1">
                        {need.status === 'in_progress' && (
                          <button 
                            onClick={() => need.id && handleMarkAsCompleted(need.id)}
                            className="px-4 py-3 bg-primary text-white rounded-lg text-sm font-bold w-full text-center"
                          >
                            Mark Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 mb-6">
            <h2 className="text-2xl font-black text-foreground">Incoming Donations</h2>
            <p className="text-text-secondary mt-1">Review and manage donation offers from volunteers.</p>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden">
            {donations.length === 0 ? (
              <EmptyState
                title="No donations yet"
                description="When volunteers offer donations, they will appear here."
                className="my-8 mx-8 border-dashed"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse hidden md:table">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[#E5E3DB] text-xs uppercase tracking-wider text-text-secondary">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Description</th>
                      <th className="px-6 py-3 font-semibold">Value</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DB]">
                    {donations.map((donation) => (
                      <tr key={donation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {format(donation.createdAt, "MMM d, yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-foreground max-w-xs truncate" title={donation.description}>
                            {donation.description}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">
                          {donation.amount || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold capitalize ${
                              donation.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                              donation.status === 'ACCEPTED' ? 'bg-green-50 text-green-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                            {donation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {donation.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateDonation(donation.id, 'ACCEPTED')}
                                  className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-xs font-bold"
                                >
                                  Accept
                                </button>
                                <button 
                                  onClick={() => handleUpdateDonation(donation.id, 'REJECTED')}
                                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-xs font-bold"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="md:hidden flex flex-col divide-y divide-[#E5E3DB]">
                  {donations.map((donation) => (
                    <div key={donation.id} className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-foreground">{donation.description}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{format(donation.createdAt, "MMM d, yyyy")} • Value: {donation.amount || "N/A"}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold capitalize ${
                            donation.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                            donation.status === 'ACCEPTED' ? 'bg-green-50 text-green-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                          {donation.status}
                        </span>
                      </div>
                      
                      {donation.status === 'PENDING' && (
                        <div className="flex gap-2 pt-2 border-t border-[#E5E3DB] mt-1">
                          <button 
                            onClick={() => handleUpdateDonation(donation.id, 'ACCEPTED')}
                            className="flex-1 py-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors text-sm font-bold text-center"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleUpdateDonation(donation.id, 'REJECTED')}
                            className="flex-1 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors text-sm font-bold text-center"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </>
          )}

          {/* GROUPS SECTION */}
          {!initialLoading && (
            <div className="mt-12 mb-6">
              <h2 className="text-2xl font-black text-foreground">Volunteer Groups</h2>
              <p className="text-text-secondary mt-1">Create and manage groups to coordinate with volunteers.</p>
              
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Group Form */}
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm h-fit">
                  <h3 className="font-bold text-lg mb-4">Create New Group</h3>
                  <form onSubmit={handleCreateGroup} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Group Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g. Disaster Relief Team"
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Select Volunteers</label>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {volunteers.map(v => (
                          <label key={v.id} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedVolunteers.includes(v.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedVolunteers([...selectedVolunteers, v.id]);
                                else setSelectedVolunteers(selectedVolunteers.filter(id => id !== v.id));
                              }}
                            />
                            <span>{v.name || 'Unknown'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={!newGroupName.trim()} className="w-full py-2 bg-primary text-white font-bold rounded-lg disabled:opacity-50">
                      Create Group
                    </button>
                  </form>
                </div>

                {/* List Groups */}
                <div className="lg:col-span-2">
                  <div className="grid gap-4">
                    {groups.length === 0 ? (
                      <EmptyState title="No groups yet" description="Create a group to start coordinating." className="border-dashed" />
                    ) : (
                      groups.map(group => (
                        <div key={group.id} className="bg-white p-5 rounded-xl border border-[#E5E3DB] shadow-sm flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-lg">{group.groupName}</h3>
                            <p className="text-sm text-text-secondary mt-1">{group.members?.length || 0} members</p>
                          </div>
                          <Link href={`/groups/${group.id}`} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 flex items-center gap-2">
                            <MessageSquare size={16} /> Open Chat
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
