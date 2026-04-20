"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { Navbar } from "@/components/Navbar";
import { Search, MapPin, Award, CheckCircle, Clock, Star } from "lucide-react";

export default function VolunteersDirectoryPage() {
  const [volunteers, setVolunteers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [sortBy, setSortBy] = useState<"tasks" | "hours" | "rating">("tasks");

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "volunteer")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => d.data() as UserProfile);
        setVolunteers(data);
      } catch (error) {
        console.error("Error fetching volunteers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, []);

  const filteredVolunteers = volunteers.filter(v => {
    const matchesName = v.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter ? v.city?.toLowerCase() === cityFilter.toLowerCase() : true;
    return matchesName && matchesCity;
  }).sort((a, b) => {
    if (sortBy === "tasks") return (b.totalTasksCompleted || 0) - (a.totalTasksCompleted || 0);
    if (sortBy === "hours") return (b.totalHoursLogged || 0) - (a.totalHoursLogged || 0);
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  // Extract unique cities
  const cities = Array.from(new Set(volunteers.map(v => v.city).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      
      <div className="bg-primary pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-black text-white mb-4">Community Volunteers</h1>
          <p className="text-emerald-50 text-xl max-w-2xl mx-auto">
            Meet the dedicated individuals making a difference. NGOs can browse and connect with volunteers based on their skills and location.
          </p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16">
        <div className="bg-white p-4 rounded-xl shadow-lg border border-[#E5E3DB] mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="w-full md:w-48">
            <select 
              value={cityFilter} 
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-full md:w-56">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as "tasks" | "hours" | "rating")}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="tasks">Most Tasks Completed</option>
              <option value="hours">Most Hours Logged</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E5E3DB]">
            <p className="text-gray-500">No volunteers found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVolunteers.map(volunteer => (
              <Link href={`/volunteer/${volunteer.uid}`} key={volunteer.uid}>
                <div className="bg-white rounded-xl border border-[#E5E3DB] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                        {volunteer.profileImage ? (
                          <img src={volunteer.profileImage} alt={volunteer.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary-light flex items-center justify-center text-xl font-bold text-primary">
                            {volunteer.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{volunteer.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                          <MapPin size={14} /> {volunteer.city || 'Unknown'}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 font-medium font-mono">
                          <Award size={12} /> {volunteer.level || 'Newcomer'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1">
                      {volunteer.skills?.slice(0, 3).map(skill => (
                        <span key={skill} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {skill}
                        </span>
                      ))}
                      {volunteer.skills && volunteer.skills.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-50 text-gray-400 rounded">
                          +{volunteer.skills.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold mb-1">
                          <CheckCircle size={14} /> {volunteer.totalTasksCompleted || 0}
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tasks</p>
                      </div>
                      <div className="text-center">
                         <div className="flex items-center justify-center gap-1 text-blue-600 font-bold mb-1">
                          <Clock size={14} /> {volunteer.totalHoursLogged || 0}
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Hours</p>
                      </div>
                      <div className="text-center">
                         <div className="flex items-center justify-center gap-1 text-amber-500 font-bold mb-1">
                          <Star size={14} className="fill-amber-500" /> {(volunteer.rating || 0).toFixed(1)}
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
