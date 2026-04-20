"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Task } from "@/types";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chat";
import { Star, Clock, CheckCircle, Award, MapPin, MessageSquare } from "lucide-react";

export default function VolunteerProfilePage() {
  const params = useParams();
  const volunteerId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  const handleMessage = async () => {
    if (!user || !profile) return;
    setLoadingChat(true);
    try {
      const convId = await getOrCreateConversation(
        user,
        { uid: volunteerId, name: profile.name, role: 'volunteer' },
        undefined
      );
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    const fetchVolunteer = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", volunteerId));
        if (userDoc.exists() && userDoc.data().role === "volunteer") {
          setProfile(userDoc.data() as UserProfile);
          
          const tasksQuery = query(
            collection(db, "tasks"), 
            where("volunteerId", "==", volunteerId), 
            where("status", "==", "completed"),
            orderBy("completedAt", "desc"),
            limit(5)
          );
          const tasksSnap = await getDocs(tasksQuery);
          setRecentTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        }
      } catch (error) {
        console.error("Error fetching volunteer profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (volunteerId) fetchVolunteer();
  }, [volunteerId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <h2 className="text-2xl font-bold text-gray-500">Volunteer not found</h2>
    </div>
  );

  const renderStars = (rating?: number) => {
    const r = rating || 0;
    return (
      <div className="flex items-center">
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={16} className={i <= Math.round(r) ? "text-amber-400 fill-amber-400" : "text-gray-300"} />
        ))}
        <span className="ml-2 text-sm font-medium">{r.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      
      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E5E3DB] overflow-hidden">
          {/* Header */}
          <div className="p-8 sm:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-gray-100 relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-50 shadow-md flex-shrink-0">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-light flex items-center justify-center text-4xl font-bold text-primary">
                  {profile.name?.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-foreground flex items-center justify-center md:justify-start gap-3">
                    {profile.name}
                    <span className="text-sm px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-bold flex items-center gap-1">
                      <Award size={14} /> {profile.level || 'Newcomer'}
                    </span>
                  </h1>
                  
                  {profile.city && (
                    <div className="flex items-center justify-center md:justify-start gap-1 text-text-secondary mt-2">
                      <MapPin size={16} />
                      <span>{profile.city}</span>
                    </div>
                  )}
                </div>
                {user && user.uid !== volunteerId && (
                  <div className="mt-4 md:mt-0 flex flex-col md:flex-row md:items-center justify-end">
                    <button
                      onClick={handleMessage}
                      disabled={loadingChat}
                      className="flex md:self-end items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loadingChat ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MessageSquare size={18} />}
                      Message
                    </button>
                  </div>
                )}
              </div>
              
              <p className="mt-4 text-text-secondary text-lg max-w-2xl">
                {profile.bio || "Community volunteer dedicated to making a difference."}
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                {profile.skills?.map(s => (
                  <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
            <div className="p-6 text-center">
              <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24} />
              <p className="text-2xl font-bold text-foreground">{profile.totalTasksCompleted || 0}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Tasks Completed</p>
            </div>
            <div className="p-6 text-center">
              <Clock className="mx-auto text-blue-500 mb-2" size={24} />
              <p className="text-2xl font-bold text-foreground">{profile.totalHoursLogged || 0}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Hours Logged</p>
            </div>
            <div className="p-6 text-center">
              <div className="mx-auto w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full mb-2 font-bold text-sm">C</div>
              <p className="text-2xl font-bold text-foreground">{profile.coins || 0}</p>
              <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Coins Earned</p>
            </div>
            <div className="p-6 text-center flex flex-col items-center justify-center">
              {renderStars(profile.rating)}
              <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold mt-2">Avg Rating</p>
            </div>
          </div>

          <div className="p-8 sm:p-12 grid md:grid-cols-3 gap-12">
            {/* Badges Section */}
            <div className="md:col-span-1 border-r border-gray-100 pr-0 md:pr-8">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Award className="text-primary" />
                Badges
              </h3>
              
              <div className="flex flex-wrap gap-4">
                {profile.badges && profile.badges.length > 0 ? (
                  profile.badges.map(b => (
                    <div key={b} className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform cursor-help" title={b}>
                      <Star className="text-white fill-white" size={28} />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No badges earned yet.</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="md:col-span-2">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Clock className="text-primary" />
                Recent Activity
              </h3>
              
              {recentTasks.length === 0 ? (
                <p className="text-sm text-gray-500 border border-dashed border-gray-300 p-8 rounded-xl text-center">
                  No recent activities recorded.
                </p>
              ) : (
                <div className="space-y-6">
                  {recentTasks.map(task => (
                    <div key={task.id} className="flex gap-4">
                      <div className="mt-1">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-sm shadow-emerald-200">
                          <CheckCircle size={18} className="text-emerald-500" />
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="font-medium text-foreground text-sm">
                          Completed task <span className="font-bold">&quot;{task.id?.substring(0,6)}&quot;</span> for a need in {profile.city}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Recently'}
                        </p>
                        {task.feedback && (
                          <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-100 text-sm text-gray-600 italic">
                            &quot;{task.feedback}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
