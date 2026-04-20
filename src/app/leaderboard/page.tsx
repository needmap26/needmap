"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Award, Medal, Trophy, MapPin, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"week" | "month" | "all">("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Ideally, we'd query tasks for a specific time range then aggregate,
        // but for simplicity according to specs, we just orderBy coins/tasks.
        // We'll use 'coins' for rank.
        const q = query(
          collection(db, "users"),
          where("role", "==", "volunteer"),
          orderBy("coins", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        setLeaders(snap.docs.map(d => d.data() as UserProfile));
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [tab]);

  const getTrophyIcon = (index: number) => {
    if (index === 0) return <Trophy size={28} className="text-yellow-400 drop-shadow-md" />;
    if (index === 1) return <Trophy size={26} className="text-gray-300 drop-shadow-md" />;
    if (index === 2) return <Trophy size={24} className="text-amber-600 drop-shadow-md" />;
    return <span className="text-lg font-bold text-gray-500 w-7 text-center">#{index + 1}</span>;
  };

  const myRankIndex = user ? leaders.findIndex(l => l.uid === user.uid) : -1;
  // If not in top 10, we'll just mock a rank for demonstration as instructed
  const displayRank = myRankIndex !== -1 ? myRankIndex + 1 : 47;
  const amIVolunteer = leaders.length > 0; // simplistic check, handled by user.role typically

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />

      <div className="bg-primary pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-black text-white mb-4 flex items-center justify-center gap-3">
            <Medal size={40} className="text-amber-400" />
            Global Leaderboard
          </h1>
          <p className="text-emerald-50 text-xl max-w-2xl mx-auto">
            Celebrating our most active and impactful community members.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E5E3DB] overflow-hidden">
          <div className="flex border-b border-gray-100 bg-gray-50">
            <button
              onClick={() => setTab("week")}
              className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'week' ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              This Week
            </button>
            <button
              onClick={() => setTab("month")}
              className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'month' ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setTab("all")}
              className={`flex-1 py-4 text-sm font-bold transition-colors border-b-2 ${tab === 'all' ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              All Time
            </button>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                No data available for this period.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {leaders.map((leader, index) => (
                  <li key={leader.uid} className={`transition-colors hover:bg-gray-50 ${user && user.uid === leader.uid ? 'bg-primary-light/30' : ''}`}>
                    <Link href={`/volunteer/${leader.uid}`} className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                      <div className="flex items-center justify-center w-12 flex-shrink-0">
                        {getTrophyIcon(index)}
                      </div>

                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                        {leader.profileImage ? (
                          <img src={leader.profileImage} alt={leader.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary-light flex items-center justify-center text-lg font-bold text-primary">
                            {leader.name?.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{leader.name}</h3>
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100 font-mono">
                            <Award size={10} /> {leader.level || 'Newcomer'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-text-secondary mt-1 truncate">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {leader.city || '-'}</span>
                          <span className="hidden sm:inline text-gray-300">•</span>
                          <span className="hidden sm:inline-flex gap-1 overflow-hidden">
                            {leader.skills?.slice(0, 2).map(s => <span key={s} className="bg-gray-100 px-1.5 py-0.5 rounded">{s}</span>)}
                          </span>
                        </div>
                      </div>

                      <div className="flex sm:gap-6 items-center flex-shrink-0">
                        <div className="hidden sm:block text-right">
                          <div className="flex items-center justify-end gap-1 text-emerald-600 font-bold">
                            <CheckCircle size={14} /> {leader.totalTasksCompleted || 0}
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tasks</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="flex items-center justify-end gap-1 text-amber-600 font-black text-lg">
                            <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px]">C</div>
                            {leader.coins || 0}
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Coins</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {user && amIVolunteer && (
            <div className="border-t-4 border-gray-100 bg-emerald-50/50 p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold shadow-sm">
                  #{displayRank}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm sm:text-base">Your Ranking</p>
                  <p className="text-xs sm:text-sm text-text-secondary">Keep helping to climb the leaderboard!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-amber-600 flex items-center gap-1 justify-end">
                  <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px]">C</div>
                  {leaders.find(l => l.uid === user.uid)?.coins || 0}
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Your Coins</p>
              </div>
            </div>

          )}
        </div>
      </main>
    </div>
  );
}
