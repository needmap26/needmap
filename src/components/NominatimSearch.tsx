import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

interface NominatimSearchProps {
  onLocationSelect: (location: LocationData | null) => void;
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    [key: string]: string | undefined;
  };
}

export const NominatimSearch = ({ onLocationSelect }: NominatimSearchProps) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&addressdetails=1&limit=5`
      );
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setSuggestions(data);
      setShowDropdown(true);
    } catch (error) {
      console.error("Error fetching address:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (value.length > 2) {
      timeoutRef.current = setTimeout(() => {
        searchAddress(value);
      }, 500); // 500ms debounce
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    setInputValue(suggestion.display_name);
    setShowDropdown(false);
    
    const city = suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || suggestion.address?.county || "Unknown";
    
    onLocationSelect({
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
      address: suggestion.display_name,
      city: city,
    });
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          required
          placeholder="Start typing to search address..."
          className="w-full pl-10 pr-4 py-2 border border-[#E5E3DB] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-[#E5E3DB] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700 border-b border-gray-50 last:border-0"
            >
              {suggestion.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
