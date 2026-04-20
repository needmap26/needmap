"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/ui/StatCard";
import { Need, Task } from "@/types";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Clock, MapPin, Award, Timer, Globe2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ['#1D9E75', '#BA7517', '#E24B4A', '#3B82F6', '#8B5CF6'];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch NGO's Needs
        const needsQ = query(collection(db, "needs"), where("postedBy", "==", profile.uid));
        const needsSnap = await getDocs(needsQ);
        const needsData = needsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Need));
        setNeeds(needsData);

        // Fetch tasks corresponding to these needs
        // In a real app we might query tasks by needIds, or tasks have ngoId. 
        // For simplicity we'll just fetch all tasks (usually bad for prod if big data) and filter.
        if (needsData.length > 0) {
          const needIds = needsData.map(n => n.id!);
          // Fetch tasks in chunks if too many, but we'll fetch all here
          const tasksQ = query(collection(db, "tasks"));
          const tasksSnap = await getDocs(tasksQ);
          const tasksData = tasksSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Task))
            .filter(t => needIds.includes(t.needId));
          setTasks(tasksData);
        }
      } catch (error) {
        console.error("Error fetching analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  // Derived metrics
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = { food: 0, medical: 0, shelter: 0, education: 0, other: 0 };
    needs.forEach(n => counts[n.category] = (counts[n.category] || 0) + 1);
    return Object.keys(counts).map(key => ({ name: key.charAt(0).toUpperCase() + key.slice(1), count: counts[key] }));
  }, [needs]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 };
    needs.forEach(n => counts[n.status] = (counts[n.status] || 0) + 1);
    return Object.keys(counts).map(key => ({ name: key.replace('_', ' '), value: counts[key] }));
  }, [needs]);

  const trendsData = useMemo(() => {
    const last30Days = Array.from({length: 30}).map((_, i) => subDays(startOfDay(new Date()), 29 - i));
    const data = last30Days.map(date => {
      return {
        date: format(date, "MMM dd"),
        resolved: needs.filter(n => n.resolvedAt && startOfDay(new Date(n.resolvedAt)).getTime() === date.getTime()).length
      };
    });
    return data;
  }, [needs]);

  const activeCity = useMemo(() => {
    const counts: Record<string, number> = {};
    needs.forEach(n => counts[n.location?.city || "Unknown"] = (counts[n.location?.city || "Unknown"] || 0) + 1);
    let mostActive = "None";
    let max = 0;
    for (const city in counts) {
      if (counts[city] > max) { max = counts[city]; mostActive = city; }
    }
    return mostActive;
  }, [needs]);

  const topVolunteer = useMemo(() => {
    const counts: Record<string, {name: string, count: number}> = {};
    tasks.forEach(t => {
      if (t.status === 'completed') {
        if (!counts[t.volunteerId]) counts[t.volunteerId] = { name: t.volunteerName, count: 0 };
        counts[t.volunteerId].count++;
      }
    });
    let top = "None";
    let max = 0;
    for (const vid in counts) {
      if (counts[vid].count > max) { max = counts[vid].count; top = counts[vid].name; }
    }
    return top;
  }, [tasks]);

  const avgResolutionTime = useMemo(() => {
    const resolved = needs.filter(n => n.status === 'resolved' && n.resolvedAt);
    if (resolved.length === 0) return 0;
    const totalTime = resolved.reduce((acc, n) => acc + (n.resolvedAt! - n.createdAt), 0);
    return Math.floor(totalTime / resolved.length / (1000 * 60 * 60)); // hours
  }, [needs]);

  const totalVolHours = useMemo(() => {
    // arbitrary translation: 1 completed task = 2 hours avg
    return tasks.filter(t => t.status === 'completed').length * 2;
  }, [tasks]);


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]"><div className="w-8 h-8 border-4 animate-spin border-primary rounded-full border-t-transparent"></div></div>;

  return (
    <ProtectedRoute allowedRoles={["ngo_admin"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">Impact Analytics</h1>
            <p className="text-text-secondary mt-1">Measure the real-world difference you are making.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Volunteer Hours" value={`${totalVolHours} hrs`} icon={<Clock size={24} />} />
            <StatCard title="Most Active City" value={activeCity} icon={<MapPin size={24} />} />
            <StatCard title="Top Volunteer" value={topVolunteer} icon={<Award size={24} />} />
            <StatCard title="Avg Resolution Time" value={`${avgResolutionTime} hrs`} icon={<Timer size={24} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Needs By Category */}
            <div className="bg-white p-6 border border-[#E5E3DB] rounded-xl shadow-sm lg:col-span-1">
              <h3 className="font-bold text-foreground mb-6">Needs by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E3DB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#5F5E5A'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#5F5E5A'}} />
                    <RechartsTooltip cursor={{fill: '#FAFAF9'}} />
                    <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Needs Resolved Over Time */}
            <div className="bg-white p-6 border border-[#E5E3DB] rounded-xl shadow-sm lg:col-span-2">
              <h3 className="font-bold text-foreground mb-6">Needs Resolved (Last 30 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E3DB" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#5F5E5A'}} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#5F5E5A'}} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="resolved" stroke="#1D9E75" strokeWidth={3} dot={{r: 4, fill: '#1D9E75'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Status Distribution */}
            <div className="bg-white p-6 border border-[#E5E3DB] rounded-xl shadow-sm lg:col-span-1">
              <h3 className="font-bold text-foreground mb-6">Status Distribution</h3>
              <div className="h-64 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-4 text-xs">
                  {statusData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center gap-1 capitalize">
                      <span className="w-3 h-3 rounded-sm" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* UN SDGs Alignment */}
            <div className="bg-gradient-to-r from-primary to-primary-dark p-8 border border-primary-dark rounded-xl shadow-lg lg:col-span-2 text-white relative overflow-hidden flex flex-col justify-center">
              <Globe2 size={120} className="absolute -right-6 -bottom-6 opacity-10 text-white" />
              <h3 className="text-2xl font-black mb-4 relative z-10">Supporting UN Sustainable Development Goals</h3>
              <p className="text-primary-light mb-6 max-w-lg relative z-10 text-sm">
                Your efforts on NeedMap directly contribute to the following global goals ensuring a better, more sustainable future for all.
              </p>
              <div className="flex flex-wrap gap-2 relative z-10">
                <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 cursor-default rounded-md text-sm font-bold backdrop-blur-sm transition-colors border border-white/10">SDG 1: No Poverty</span>
                <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 cursor-default rounded-md text-sm font-bold backdrop-blur-sm transition-colors border border-white/10">SDG 2: Zero Hunger</span>
                <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 cursor-default rounded-md text-sm font-bold backdrop-blur-sm transition-colors border border-white/10">SDG 3: Good Health</span>
                <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 cursor-default rounded-md text-sm font-bold backdrop-blur-sm transition-colors border border-white/10">SDG 10: Reduced Inequalities</span>
                <span className="px-3 py-1.5 bg-white/20 hover:bg-white/30 cursor-default rounded-md text-sm font-bold backdrop-blur-sm transition-colors border border-white/10">SDG 11: Sustainable Cities</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
