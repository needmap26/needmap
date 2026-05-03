"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { Plus, MessageSquare, Users, UserPlus, Shield, Loader2, Search, CheckCircle, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GroupsPage() {
  const { profile } = useAuth();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addVolunteerModalGroupId, setAddVolunteerModalGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [viewMembersGroupId, setViewMembersGroupId] = useState<string | null>(null);
  
  const [viewProfileModalData, setViewProfileModalData] = useState<any | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch groups
    const gQuery = query(collection(db, "groups"), where("ngoId", "==", profile.uid));
    const unsubGroups = onSnapshot(gQuery, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Fetch join requests
    const rQuery = query(collection(db, "groupRequests"), where("ngoId", "==", profile.uid), where("status", "==", "pending"));
    const unsubRequests = onSnapshot(rQuery, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch volunteers
    const vQuery = query(collection(db, "users"), where("role", "==", "volunteer"));
    const unsubVolunteers = onSnapshot(vQuery, (snap) => {
      setVolunteers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubGroups();
      unsubRequests();
      unsubVolunteers();
    };
  }, [profile?.uid]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !profile?.uid) return;
    
    setCreatingGroup(true);
    const toastId = toast.loading("Creating group...");
    try {
      await addDoc(collection(db, "groups"), {
        groupName: newGroupName.trim(),
        ngoId: profile.uid,
        ngoName: profile.ngoName || profile.name,
        members: [],
        createdAt: serverTimestamp()
      });
      setNewGroupName("");
      toast.success("Group created successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to create group", { id: toastId });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleManualAddVolunteer = async (volunteerId: string) => {
    if (!addVolunteerModalGroupId) return;
    const toastId = toast.loading("Adding volunteer...");
    try {
      const groupRef = doc(db, "groups", addVolunteerModalGroupId);
      await updateDoc(groupRef, {
        members: arrayUnion(volunteerId)
      });
      toast.success("Volunteer added to group!", { id: toastId });
      setAddVolunteerModalGroupId(null);
    } catch (error) {
      toast.error("Failed to add volunteer", { id: toastId });
    }
  };

  const handleAcceptRequest = async (requestId: string, groupId: string, volunteerId: string) => {
    const toastId = toast.loading("Accepting request...");
    try {
      // 1. Add volunteer to group members
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayUnion(volunteerId)
      });
      // 2. Update request status
      await updateDoc(doc(db, "groupRequests", requestId), {
        status: "accepted"
      });
      toast.success("Request accepted!", { id: toastId });
    } catch (error) {
      toast.error("Failed to accept request", { id: toastId });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const toastId = toast.loading("Rejecting request...");
    try {
      await updateDoc(doc(db, "groupRequests", requestId), {
        status: "rejected"
      });
      toast.success("Request rejected", { id: toastId });
    } catch (error) {
      toast.error("Failed to reject request", { id: toastId });
    }
  };

  const handleViewProfile = async (volunteerId: string) => {
    const toastId = toast.loading("Loading profile...");
    try {
      const userDoc = await getDoc(doc(db, "users", volunteerId));
      if (userDoc.exists()) {
        setViewProfileModalData({ id: userDoc.id, ...userDoc.data() });
      } else {
        toast.error("User not found");
      }
      toast.dismiss(toastId);
    } catch (error) {
      toast.error("Failed to load profile", { id: toastId });
    }
  };

  // Filter volunteers for manual add
  const currentGroup = groups.find(g => g.id === addVolunteerModalGroupId);
  const filteredVolunteers = volunteers.filter(v => {
    // Search match
    const q = searchQuery.toLowerCase();
    const match = (v.name?.toLowerCase() || "").includes(q) || (v.email?.toLowerCase() || "").includes(q);
    // Not already in group
    const notInGroup = !(currentGroup?.members || []).includes(v.id);
    return match && notInGroup;
  });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["ngo"]}>
        <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["ngo"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Groups Management</h1>
            <p className="text-text-secondary mt-1">Create groups and coordinate with your volunteers.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Group Form */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> Create New Group</h3>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Group Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                      placeholder="e.g. Disaster Relief Team"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <button type="submit" disabled={!newGroupName.trim() || creatingGroup} className="w-full py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {creatingGroup ? "Creating..." : "Create Group"}
                  </button>
                </form>
              </div>

              {/* Join Requests */}
              <div className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserPlus size={18} /> Join Requests</h3>
                {requests.length === 0 ? (
                  <p className="text-sm text-text-secondary italic">No pending requests.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map(req => (
                      <div key={req.id} className="p-3 border rounded-lg flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm">{req.volunteerName || "Unknown"}</p>
                            <p className="text-[10px] text-gray-500">Group: {groups.find(g => g.id === req.groupId)?.groupName || "Unknown"}</p>
                          </div>
                          <button 
                            onClick={() => handleViewProfile(req.volunteerId)}
                            className="text-[10px] font-bold text-primary underline"
                          >
                            View Profile
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button 
                            onClick={() => handleAcceptRequest(req.id, req.groupId, req.volunteerId)}
                            className="flex items-center justify-center gap-1 py-1.5 bg-green-50 text-green-700 rounded font-bold text-xs hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(req.id)}
                            className="flex items-center justify-center gap-1 py-1.5 bg-red-50 text-red-700 rounded font-bold text-xs hover:bg-red-100 transition-colors"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* List Groups */}
            <div className="lg:col-span-2">
              <div className="grid gap-4">
                {groups.length === 0 ? (
                  <EmptyState title="No groups yet" description="Create a group to start coordinating." className="border-dashed bg-white" />
                ) : (
                  groups.map(group => (
                    <div key={group.id} className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-xl text-foreground">{group.groupName}</h3>
                        <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                          <Users size={14} /> {group.members?.length || 0} members
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/groups/${group.id}`} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 flex items-center gap-1 transition-colors">
                          <MessageSquare size={16} /> Open Chat
                        </Link>
                        <button 
                          onClick={() => setAddVolunteerModalGroupId(group.id)}
                          className="px-3 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-dark flex items-center gap-1 transition-colors"
                        >
                          <Plus size={16} /> Add Volunteer
                        </button>
                        <button 
                          onClick={() => setViewMembersGroupId(group.id)}
                          className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        >
                          <Users size={16} /> View Members
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Add Volunteer Modal */}
        {addVolunteerModalGroupId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[80vh]">
              <div className="p-4 border-b flex justify-between items-center shrink-0">
                <h3 className="font-bold text-lg">Add Volunteer</h3>
                <button onClick={() => { setAddVolunteerModalGroupId(null); setSearchQuery(""); }} className="text-gray-500 hover:text-black">✕</button>
              </div>
              <div className="p-4 border-b shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by name or email..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {filteredVolunteers.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 italic py-4">No available volunteers found.</p>
                ) : (
                  filteredVolunteers.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-sm">{v.name || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{v.email}</p>
                      </div>
                      <button 
                        onClick={() => handleManualAddVolunteer(v.id)}
                        className="px-3 py-1 bg-primary text-white text-xs font-bold rounded hover:bg-primary-dark transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Members Modal */}
        {viewMembersGroupId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[80vh]">
              <div className="p-4 border-b flex justify-between items-center shrink-0">
                <h3 className="font-bold text-lg">Group Members</h3>
                <button onClick={() => setViewMembersGroupId(null)} className="text-gray-500 hover:text-black">✕</button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {(() => {
                  const group = groups.find(g => g.id === viewMembersGroupId);
                  const memberIds = group?.members || [];
                  if (memberIds.length === 0) return <p className="text-sm text-gray-500 text-center py-4">No members yet.</p>;
                  
                  return memberIds.map((id: string) => {
                    const v = volunteers.find(vol => vol.id === id);
                    return (
                      <div key={id} className="p-3 border rounded-lg flex justify-between items-center">
                        <div>
                           <p className="font-bold text-sm">{v?.name || "Unknown User"}</p>
                           <p className="text-xs text-gray-500">{v?.email || "No email"}</p>
                        </div>
                        <button 
                          onClick={() => handleViewProfile(id)}
                          className="text-[10px] text-primary underline"
                        >
                          View Profile
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* View Profile Modal */}
        {viewProfileModalData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2"><Shield size={18} className="text-primary"/> Volunteer Profile</h3>
                <button onClick={() => setViewProfileModalData(null)} className="text-gray-500 hover:text-black">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase">Name</p>
                  <p className="font-medium text-lg">{viewProfileModalData.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-bold uppercase">Email</p>
                  <p className="font-medium">{viewProfileModalData.email || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">Tasks</p>
                    <p className="font-medium text-xl">{viewProfileModalData.totalTasksCompleted || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase">Rating</p>
                    <p className="font-medium text-xl">{viewProfileModalData.rating || "N/A"}</p>
                  </div>
                </div>
                {viewProfileModalData.achievements && viewProfileModalData.achievements.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 font-bold uppercase mb-1">Achievements</p>
                    <div className="flex flex-wrap gap-2">
                      {viewProfileModalData.achievements.map((ach: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-bold">
                          {ach}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
