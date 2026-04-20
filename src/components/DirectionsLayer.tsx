import { useEffect } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Need } from "@/types";

interface DirectionsLayerProps {
  origin: google.maps.LatLngLiteral | undefined;
  destination: Need | null;
}

export const DirectionsLayer = ({ origin, destination }: DirectionsLayerProps) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');

  useEffect(() => {
    if (!routesLibrary || !map || !origin || !destination) return;

    const ds = new routesLibrary.DirectionsService();
    const dr = new routesLibrary.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 5,
        strokeOpacity: 0.8,
      }
    });

    dr.setMap(map);

    ds.route({
        origin,
        destination: { lat: destination.location.lat, lng: destination.location.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      })
      .then((response) => {
        dr.setDirections(response);
      })
      .catch((e) => {
        console.error("Directions request failed", e);
      });

    return () => {
      dr.setMap(null);
    };
  }, [routesLibrary, map, origin, destination]);

  return null;
};
