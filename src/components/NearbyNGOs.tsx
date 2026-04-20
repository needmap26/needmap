"use client";

import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateConversation } from "@/lib/chat";
import { useRouter } from "next/navigation";
import { Phone, Mail, MessageCircle, MapPin, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// Haversine formula for distance calculation (in kilometers)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function NearbyNGOs() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [ngos, setNgos] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNGOs, setShowNGOs] = useState(false);
  const [loadingChat, setLoadingChat] = useState<string | null>(null);

  const handleShowNGOs = () => {
    setShowNGOs(true);
    setLoading(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(loc);
        await loadNearbyNGOs(loc);
      },
      (error) => {
        toast.error("Location permission denied. Cannot find nearby NGOs.");
        setLoading(false);
      }
    );
  };

  // 2. & 3. & 4. Firestore query, distance calculation, filtering + sorting
  const loadNearbyNGOs = async (loc: {lat: number, lng: number}) => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "ngo_admin"));
      const snapshot = await getDocs(q);
      
      const ngoList: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.location && data.location.lat && data.location.lng) {
          const distance = getDistance(loc.lat, loc.lng, data.location.lat, data.location.lng);
          
          // Filter NGOs within 20km radius
          if (distance <= 20) {
            ngoList.push({ id: doc.id, distance, ...data });
          }
        }
      });

      // Sort by nearest first
      ngoList.sort((a, b) => a.distance - b.distance);
      setNgos(ngoList);
    } catch (error) {
      console.error("Failed to load NGOs:", error);
      toast.error("Failed to find NGOs");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (ngo: any) => {
    if (!user) return toast.error("Please login first");
    setLoadingChat(ngo.id);
    try {
      const convId = await getOrCreateConversation(
        user,
        { uid: ngo.id, name: ngo.name || "NGO Admin", role: 'ngo_admin' }
      );
      router.push(`/messages/${convId}`);
    } catch (error) {
      console.error("Failed to open chat", error);
      toast.error("Failed to open chat");
      setLoadingChat(null);
    }
  };

  if (!showNGOs) {
    return (
      <button
        onClick={handleShowNGOs}
        className="px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center gap-2"
      >
        <MapPin size={20} /> NGOs Near Me
      </button>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">NGOs Near Me</h2>
        {loading && <Loader2 size={20} className="animate-spin text-text-secondary" />}
      </div>
      
      {loading ? (
        <div className="p-8 text-center text-text-secondary border rounded-xl bg-gray-50 border-dashed">
          Finding nearby NGOs...
        </div>
      ) : !userLocation ? (
        <div className="p-8 text-center border rounded-xl bg-red-50 text-red-600">
          Location access required to find NGOs near you.
        </div>
      ) : ngos.length === 0 ? (
        <div className="p-8 text-center border border-dashed rounded-xl text-text-secondary bg-gray-50">
          No NGOs found within 20km of your location.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ngos.map((ngo) => (
            <div key={ngo.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3">
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{ngo.name || "Unnamed NGO"}</h3>
                <p className="flex items-center text-sm text-text-secondary mt-1">
                  <MapPin size={14} className="mr-1" />
                  {ngo.location?.city || "Unknown Location"} ({ngo.distance.toFixed(1)} km)
                </p>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                {ngo.phone && (
                  <button 
                    onClick={() => window.open(`tel:${ngo.phone}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium text-sm transition-colors"
                  >
                    <Phone size={16} /> Call
                  </button>
                )}
                {ngo.email && (
                  <button 
                    onClick={() => window.open(`mailto:${ngo.email}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                  >
                    <Mail size={16} /> Email
                  </button>
                )}
                <button 
                  onClick={() => handleChat(ngo)}
                  disabled={loadingChat === ngo.id}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {loadingChat === ngo.id ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

