"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Need } from '@/types';
import { useAuth } from '@/context/AuthContext';

// Fix for default marker icons in Leaflet with Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

const getPriorityIcon = (priority: string, isTopPriority: boolean) => {
  let color = 'orange'; // medium
  if (priority === 'critical' || priority === 'high') color = 'red';
  else if (priority === 'low') color = 'green';
  
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: isTopPriority ? [35, 57] : [25, 41],
    iconAnchor: isTopPriority ? [17, 57] : [12, 41],
    popupAnchor: [1, -34],
    shadowSize: isTopPriority ? [57, 57] : [41, 41],
    className: 'animate-bounce drop-shadow-md'
  });
};

L.Marker.prototype.options.icon = defaultIcon;

interface LeafletMapProps {
  need?: Need;
  needs?: Need[];
  onAcceptTask?: (needId: string) => void;
  isAccepting?: boolean;
}

const MapUpdater = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    // Essential for fixing gray map tile issues in modals
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
};

const HeatLayer = ({ needs }: { needs: Need[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!needs || needs.length === 0) return;
    const heatData = needs.map((n: any) => [
      n.location.lat,
      n.location.lng,
      n.urgency === "high" || n.priority === "high" || n.priority === "critical" ? 1 : 0.5
    ]);
    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17
    }).addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, needs]);
  return null;
};

export default function LeafletMap({
  need,
  needs = [],
  onAcceptTask,
  isAccepting = false,
}: LeafletMapProps) {
  const { profile } = useAuth();
  
  const allNeeds = need && !needs.find(n => n.id === need.id) ? [need, ...needs] : needs.length ? needs : (need ? [need] : []);

  if (allNeeds.length === 0 || !allNeeds[0]?.location?.lat || !allNeeds[0]?.location?.lng) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm font-medium">
        Location unavailable
      </div>
    );
  }

  const centerNeed = need || allNeeds[0];

  return (
    <div className="w-full h-full z-0 relative">
      <MapContainer 
        center={[centerNeed.location.lat, centerNeed.location.lng]} 
        zoom={15} 
        scrollWheelZoom={true}
        zoomControl={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={centerNeed.location} />
        <HeatLayer needs={allNeeds} />

        {allNeeds.map((n) => (
          <Marker 
            key={n.id || Math.random().toString()}
            position={[n.location.lat, n.location.lng]}
            icon={getPriorityIcon(n.priority || 'medium', n.id === centerNeed.id)}
          >
            <Popup>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded text-white ${n.priority === 'critical' || n.priority === 'high' ? 'bg-red-500' : n.priority === 'low' ? 'bg-green-500' : 'bg-orange-500'}`}>
                    {n.priority || 'Medium'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-gray-100 text-gray-600 rounded">
                    {n.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm m-0">{n.title}</h3>
                <p className="text-xs text-gray-600 m-0 line-clamp-2">{n.description}</p>
                
                <div className="flex gap-2 mt-2">
                  {profile?.role === "volunteer" && onAcceptTask && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAcceptTask(n.id!); }}
                      disabled={isAccepting}
                      className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isAccepting ? "Accepting..." : "Help (Accept Need)"}
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
