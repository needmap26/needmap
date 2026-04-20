"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Need, NeedCategory } from "@/types";
import { Navbar } from "@/components/Navbar";
import { NeedCard } from "@/components/NeedCard";
import LocationPermissionBanner from "@/components/LocationPermissionBanner";
import { DirectionsLayer } from "@/components/DirectionsLayer";
import { getUserLocation, DEFAULT_LOCATION } from "@/lib/location";
import { Phone, Mail, MessageCircle, MapPin, Loader2, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chat";

const mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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

const HeatmapLayer = ({ needs }: { needs: Need[] }) => {
  const map = useMap();
  const visualization = useMapsLibrary('visualization');
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!visualization || !map) return;

    if (heatmapRef.current) heatmapRef.current.setMap(null);

    const data = needs.map(need => ({
      location: new google.maps.LatLng(need.location.lat, need.location.lng),
      weight: need.priority === "emergency" ? 1.0 : need.priority === "high" ? 0.75 : need.priority === "medium" ? 0.5 : 0.25
    }));

    const newHeatmap = new visualization.HeatmapLayer({
      data,
      radius: 30,
      gradient: [
        'rgba(0, 255, 0, 0)',
        'rgba(255, 255, 0, 1)',
        'rgba(255, 0, 0, 1)'
      ] // green -> yellow -> red
    });

    newHeatmap.setMap(map);
    heatmapRef.current = newHeatmap;

    return () => {
      newHeatmap.setMap(null);
    };
  }, [visualization, map, needs]);

  return null;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "emergency": return "#E24B4A"; // red
    case "high": return "#F97316";      // orange
    case "medium": return "#EAB308";    // yellow
    case "low": return "#1D9E75";       // green
    default: return "#1D9E75";
  }
};

export default function MapPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [needs, setNeeds] = useState<Need[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);

  const [ngos, setNgos] = useState<any[]>([]);
  const [selectedNgo, setSelectedNgo] = useState<any | null>(null);
  const [loadingChat, setLoadingChat] = useState<string | null>(null);

  // User location states
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [filteredNeeds, setFilteredNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [activeNavigationNeed, setActiveNavigationNeed] = useState<Need | null>(null);

  const sortNeeds = (needArray: Need[]) => {
    if (!needArray.length) return [];
    if (!locationLoaded || !userLocation) return needArray;

    const priorityWeight: Record<string, number> = { emergency: 4, high: 3, medium: 2, low: 1 };
    
    return [...needArray].sort((a, b) => {
      const distA = getDistance(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng);
      const distB = getDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
      
      const diffDist = distA - distB;
      
      // If distance difference is significant (> 2km), sort by distance ASC
      if (Math.abs(diffDist) > 2) {
        return diffDist;
      }
      
      // Otherwise, sort by priority DESC
      const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
      const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
      if (pA !== pB) return pB - pA;
      
      // Fallback to exact distance
      return diffDist;
    });
  };

  const sortedNeeds = useMemo(() => sortNeeds(needs), [needs, locationLoaded, userLocation]);
  const sortedFilteredNeeds = useMemo(() => sortNeeds(filteredNeeds), [filteredNeeds, locationLoaded, userLocation]);

  const handleSelectNeed = (need: Need | null) => {
    setSelectedNeed(need);
    setSelectedNgo(null);
    if (need) {
      setMapCenter({ lat: need.location.lat, lng: need.location.lng });
      setMapZoom(15);
    }
  };

  const handleSelectNgo = (ngo: any | null) => {
    setSelectedNgo(ngo);
    setSelectedNeed(null);
    if (ngo) {
      setMapCenter({ lat: ngo.location.lat, lng: ngo.location.lng });
      setMapZoom(15);
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

  useEffect(() => {
    getUserLocation().then((loc) => {
      setUserLocation(loc);
      setMapCenter((prev) => prev || loc);
      setLocationLoaded(true);
    });

    // We only want unresolved needs for the map
    const q = query(
      collection(db, "needs"),
      // If we need to filter by status we can add a where clause, 
      // but without composite indexes we filter client side for some fields.
    );

    const qNgos = query(collection(db, "users"), where("role", "==", "ngo_admin"));
    getDocs(qNgos).then(snapshot => {
      const ngoList: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.location?.lat && data.location?.lng) {
          ngoList.push({ id: doc.id, ...data });
        }
      });
      setNgos(ngoList);
    }).catch(err => console.error("Error fetching NGOs for map:", err));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Need[] = [];
      let addedLatest: Need | null = null;

      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const docData = change.doc.data() as Need;
          if (docData.status !== "resolved") {
            if (!addedLatest || docData.createdAt > addedLatest.createdAt) {
              addedLatest = { id: change.doc.id, ...docData };
            }
          }
        }
      });

      snapshot.forEach(doc => {
        const data = doc.data() as Need;
        if (data.status !== "resolved") {
          docs.push({ id: doc.id, ...data });
        }
      });
      setNeeds(docs);
      
      // Auto focus newly added docs
      if (addedLatest) {
        const latest = addedLatest as Need;
        setMapCenter({ lat: latest.location.lat, lng: latest.location.lng });
      }
    }, (error) => {
      console.error("Map needs listener error:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleFindNeeds = async () => {
    if (!selectedCategory || !selectedPriority) {
      alert("Please select both a category and a priority to search.");
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "needs"),
        where("category", "==", selectedCategory),
        where("priority", "==", selectedPriority)
      );
      
      const querySnapshot = await getDocs(q);
      const results: Need[] = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as Need);
      });
      
      setFilteredNeeds(results);
      setSearchPerformed(true);

      // Auto-focus map to the first result if available
      if (results.length > 0) {
        setMapCenter({ lat: results[0].location.lat, lng: results[0].location.lng });
        setMapZoom(13);
      }
    } catch (error) {
      console.error("Error finding needs:", error);
      alert("Failed to find needs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <Navbar />
      
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Filters */}
        <div className="bg-white w-full md:w-80 border-b md:border-r border-[#E5E3DB] p-4 flex flex-col gap-4 overflow-y-auto max-h-[40vh] md:max-h-full z-10 shrink-0 shadow-sm relative">
          <h2 className="font-bold text-foreground">Live Map Filters</h2>
          
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Category</label>
            <select 
              className="w-full px-3 py-2 bg-gray-50 border border-[#E5E3DB] rounded-md text-sm outline-none"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Select Category...</option>
              <option value="food">Food</option>
              <option value="medical">Medical</option>
              <option value="shelter">Shelter</option>
              <option value="education">Education</option>
              <option value="disaster">Disaster</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Priority</label>
            <select 
              className="w-full px-3 py-2 bg-gray-50 border border-[#E5E3DB] rounded-md text-sm outline-none"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="">Select Priority...</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={handleFindNeeds}
            disabled={loading}
            className="w-full mt-2 px-4 py-2.5 bg-primary text-white font-bold rounded-lg shadow-sm hover:bg-primary-dark transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {loading ? "Searching..." : "🔍 Find Needs"}
          </button>

          <div className="flex-1 flex flex-col min-h-[200px] mt-2 border-t border-[#E5E3DB] pt-4 overflow-hidden">
            <h3 className="text-sm font-bold text-foreground mb-3">Find Need</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {searchPerformed && sortedFilteredNeeds.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No needs found.</p>
              ) : !searchPerformed ? (
                <p className="text-sm text-gray-500 text-center py-4">Select filters and click Find Needs.</p>
              ) : (
                sortedFilteredNeeds.map(need => (
                  <div 
                    key={need.id}
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-between ${selectedNeed?.id === need.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-[#E5E3DB] hover:bg-gray-50'}`}
                  >
                    <div className="flex-1 pr-3">
                      <h4 className="font-bold text-sm text-foreground line-clamp-2">{need.title}</h4>
                    </div>
                    <button
                      onClick={() => handleSelectNeed(need)}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-md hover:bg-primary-dark shadow-sm transition-colors"
                    >
                      Find
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative flex flex-col">
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
             <div className="pointer-events-auto w-full max-w-md">
               <LocationPermissionBanner />
             </div>
          </div>

          {!mapsApiKey ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Google Maps API Key Missing</h3>
              <p className="text-gray-500 max-w-md">The map cannot be loaded. Please ensure that NEXT_PUBLIC_MAPS_API_KEY is securely configured in your .env.local file.</p>
            </div>
          ) : (
            <APIProvider apiKey={mapsApiKey} libraries={['visualization', 'routes']}>
              <Map
                zoom={mapZoom}
                onZoomChanged={(ev) => setMapZoom(ev.detail.zoom)}
                center={mapCenter || (locationLoaded ? userLocation : undefined)}
                onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
                defaultCenter={DEFAULT_LOCATION}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
                mapId="needmap-id" // Required for AdvancedMarker
              >
                <DirectionsLayer 
                  origin={locationLoaded ? userLocation : undefined} 
                  destination={activeNavigationNeed} 
                />
                
                <HeatmapLayer needs={searchPerformed ? sortedFilteredNeeds : sortedNeeds} />

                {/* User Location Marker */}
                {locationLoaded && (
                  <AdvancedMarker position={userLocation} zIndex={100}>
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse" />
                  </AdvancedMarker>
                )}

                {(searchPerformed ? sortedFilteredNeeds : sortedNeeds).map((need, idx) => (
                  <AdvancedMarker
                    key={need.id || idx}
                    position={{ lat: need.location.lat, lng: need.location.lng }}
                    onClick={() => handleSelectNeed(need)}
                  >
                    <Pin background={getPriorityColor(need.priority || 'medium')} borderColor="#fff" glyphColor="#fff" />
                  </AdvancedMarker>
                ))}

                {/* NGO Markers */}
                {ngos.map((ngo, idx) => (
                  <AdvancedMarker
                    key={`ngo-${ngo.id || idx}`}
                    position={{ lat: ngo.location.lat, lng: ngo.location.lng }}
                    onClick={() => handleSelectNgo(ngo)}
                    zIndex={50}
                  >
                    <Pin background="#3B82F6" borderColor="#1D4ED8" glyphColor="#fff" />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          )}

          {/* overlay card when marker clicked */}
          {selectedNeed && (
            <div className="absolute bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 bg-transparent z-50 animate-in fade-in slide-in-from-bottom-5">
              <div className="relative">
                <button 
                  onClick={() => {
                    handleSelectNeed(null);
                    setActiveNavigationNeed(null);
                  }}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-[#E5E3DB] rounded-full flex items-center justify-center shadow-lg text-text-secondary hover:text-foreground z-10 hover:scale-105 transition-transform"
                >
                  ✕
                </button>
                <NeedCard 
                  need={selectedNeed} 
                  onNavigate={(need) => setActiveNavigationNeed(need)}
                  isActiveNavigate={activeNavigationNeed?.id === selectedNeed.id}
                />
              </div>
            </div>
          )}

          {/* NGO Info Overlay */}
          {selectedNgo && (
            <div className="absolute bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 bg-white rounded-xl shadow-lg border border-[#E5E3DB] z-50 animate-in fade-in slide-in-from-bottom-5">
              <div className="relative p-5">
                <button 
                  onClick={() => handleSelectNgo(null)}
                  className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-[#E5E3DB] rounded-full flex items-center justify-center shadow-lg text-text-secondary hover:text-foreground z-10 hover:scale-105 transition-transform"
                >
                  ✕
                </button>
                
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
                      <Building2 size={10} /> NGO Partner
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground line-clamp-1">{selectedNgo.name || "Unnamed NGO"}</h3>
                  <p className="flex items-center text-sm text-text-secondary mt-1">
                    <MapPin size={14} className="mr-1" />
                    {selectedNgo.location?.city || "Unknown Location"} 
                    {locationLoaded && userLocation ? ` (${getDistance(userLocation.lat, userLocation.lng, selectedNgo.location.lat, selectedNgo.location.lng).toFixed(1)} km)` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E5E3DB]">
                  {selectedNgo.phone && (
                    <button 
                      onClick={() => window.open(`tel:${selectedNgo.phone}`)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium text-sm transition-colors"
                    >
                      <Phone size={16} /> Call
                    </button>
                  )}
                  {selectedNgo.email && (
                    <button 
                      onClick={() => window.open(`mailto:${selectedNgo.email}`)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                    >
                      <Mail size={16} /> Email
                    </button>
                  )}
                  <button 
                    onClick={() => handleChat(selectedNgo)}
                    disabled={loadingChat === selectedNgo.id}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {loadingChat === selectedNgo.id ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
