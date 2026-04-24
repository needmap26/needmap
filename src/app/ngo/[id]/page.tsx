"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, Need } from "@/types";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chat";
import { MapPin, Globe, Phone, TicketCheck, ShieldCheck, MessageSquare } from "lucide-react";

export default function NGOProfilePage() {
  const params = useParams();
  const ngoId = params.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);

  const handleMessage = async () => {
    if (!user || !profile) return;
    setLoadingChat(true);
    try {
      const convId = await getOrCreateConversation(
        user,
        { uid: ngoId, name: profile.ngoName, role: 'ngo' },
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
    const fetchNGO = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", ngoId));
        if (userDoc.exists() && userDoc.data().role === "ngo") {
          setProfile(userDoc.data() as UserProfile);
          
          const needsQuery = query(collection(db, "needs"), where("postedBy", "==", ngoId), where("status", "==", "open"));
          const needsSnap = await getDocs(needsQuery);
          setNeeds(needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need)));
        }
      } catch (error) {
        console.error("Error fetching NGO profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (ngoId) fetchNGO();
  }, [ngoId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <h2 className="text-2xl font-bold text-gray-500">NGO not found</h2>
    </div>
  );

  const osmUrl = profile.location 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${profile.location.lng - 0.01},${profile.location.lat - 0.01},${profile.location.lng + 0.01},${profile.location.lat + 0.01}&layer=mapnik&marker=${profile.location.lat},${profile.location.lng}` 
    : '';

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      
      <main className="max-w-5xl mx-auto pb-16">
        {/* Banner Section */}
        <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary to-emerald-600 rounded-b-xl overflow-hidden shadow-md">
          {profile.coverImage && (
            <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>
        
        {/* Profile Info */}
        <div className="px-4 sm:px-6 lg:px-8 relative -mt-16 sm:-mt-24 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white p-2 rounded-full shadow-lg border-4 border-white flex-shrink-0">
              {profile.profileImage ? (
                <img src={profile.profileImage} alt={profile.ngoName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400">
                  {profile.ngoName?.charAt(0)}
                </div>
              )}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
                    {profile.ngoName}
                    {profile.verified && <ShieldCheck className="text-blue-500" size={24} />}
                  </h1>
                  <p className="text-text-secondary mt-1 max-w-2xl">{profile.bio}</p>
                </div>
                
                {user && user.uid !== ngoId && (
                  <button
                    onClick={handleMessage}
                    disabled={loadingChat}
                    className="flex md:self-end items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loadingChat ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MessageSquare size={18} />}
                    Message
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 sm:px-6 lg:px-8 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DB] shadow-sm text-center">
              <p className="text-2xl font-bold text-primary">{profile.totalNeedsPosted || 0}</p>
              <p className="text-sm text-text-secondary">Needs Posted</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DB] shadow-sm text-center">
              <p className="text-2xl font-bold text-amber-500">{profile.totalResolved || 0}</p>
              <p className="text-sm text-text-secondary">Resolved</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DB] shadow-sm text-center">
              <p className="text-2xl font-bold text-emerald-500">{profile.activeVolunteers || 0}</p>
              <p className="text-sm text-text-secondary">Volunteers</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E5E3DB] shadow-sm text-center">
              <p className="text-2xl font-bold text-blue-500">{profile.foundedYear || '-'}</p>
              <p className="text-sm text-text-secondary">Founded</p>
            </div>
          </div>
        </div>

        {/* Details & Needs */}
        <div className="px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-foreground">Contact & Info</h3>
              <div className="space-y-3">
                {profile.address && (
                  <div className="flex items-start gap-3 text-text-secondary">
                    <MapPin className="mt-1 flex-shrink-0" size={18} />
                    <span>{profile.address}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-start gap-3 text-text-secondary">
                    <Globe className="mt-1 flex-shrink-0" size={18} />
                    <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{profile.website}</a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-start gap-3 text-text-secondary">
                    <Phone className="mt-1 flex-shrink-0" size={18} />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.socialLinks && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                    {profile.socialLinks.twitter && <a href={profile.socialLinks.twitter} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">𝕏</a>}
                    {profile.socialLinks.linkedin && <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-colors">in</a>}
                  </div>
                )}
              </div>
            </div>

            {osmUrl && (
              <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm overflow-hidden h-48 relative">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0" style={{ border: 0 }}
                  src={osmUrl} allowFullScreen>
                </iframe>
              </div>
            )}
          </div>
          
          <div className="md:col-span-2">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-foreground">
              <TicketCheck className="text-primary" size={24} />
              Active Needs
            </h3>
            
            {needs.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-[#E5E3DB] text-center text-text-secondary">
                This NGO has no open needs currently.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {needs.map(need => (
                  <div key={need.id} className="bg-white p-5 rounded-xl border border-[#E5E3DB] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-foreground font-title">{need.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded border font-medium ${(need.priority || need.urgencyLabel) === 'emergency' || (need.priority || need.urgencyLabel) === 'critical' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-primary-light text-primary border-primary/20'}`}>
                        {(need.priority || need.urgencyLabel || 'medium').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2 mb-4">{need.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 text-sm">
                      <span className="text-gray-500">{need.requiredSkills?.join(', ')}</span>
                      <a href={`/map?need=${need.id}`} className="text-primary font-medium hover:underline">View Map</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
