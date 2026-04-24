"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  need: Need;
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

export default function LeafletMap({
  need,
  onAcceptTask,
  isAccepting = false,
}: LeafletMapProps) {
  const { profile } = useAuth();

  if (!need?.location?.lat || !need?.location?.lng) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm font-medium">
        Location unavailable
      </div>
    );
  }

  return (
    <div className="w-full h-full z-0 relative">
      <MapContainer 
        center={[need.location.lat, need.location.lng]} 
        zoom={15} 
        scrollWheelZoom={true}
        zoomControl={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={need.location} />

        <Marker 
          position={[need.location.lat, need.location.lng]}
          icon={getPriorityIcon(need.priority || 'medium', true)}
        >
          <Popup>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded text-white ${need.priority === 'critical' || need.priority === 'high' ? 'bg-red-500' : need.priority === 'low' ? 'bg-green-500' : 'bg-orange-500'}`}>
                  {need.priority || 'Medium'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-gray-100 text-gray-600 rounded">
                  {need.category}
                </span>
              </div>
              <h3 className="font-bold text-sm m-0">{need.title}</h3>
              <p className="text-xs text-gray-600 m-0 line-clamp-2">{need.description}</p>
              
              <div className="flex gap-2 mt-2">
                {profile?.role === "volunteer" && onAcceptTask && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAcceptTask(need.id!); }}
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
      </MapContainer>
    </div>
  );
}
