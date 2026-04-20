"use client";

import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, ProtectedRoute } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { NeedCard } from "@/components/NeedCard";
import { TaskCard } from "@/components/TaskCard";
import { NearbyNGOs } from "@/components/NearbyNGOs";
import { Need, Task } from "@/types";
import toast from "react-hot-toast";

export default function VolunteerDashboard() {
  const { profile } = useAuth();
  const [availableNeeds, setAvailableNeeds] = useState<Need[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [taskNeeds, setTaskNeeds] = useState<Record<string, Need>>({}); // Map needId -> Need
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    // 1. Listen for open needs
    const needsQ = query(collection(db, "needs"), where("status", "==", "open"));
    const unsubNeeds = onSnapshot(needsQ, (snapshot) => {
      const docs: Need[] = [];
      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() } as Need));
      // Sort by urgency Score desc
      setAvailableNeeds(docs.sort((a, b) => {
        const getVal = (n: Need) => n.priority === 'emergency' ? 10 : n.priority === 'medium' ? 5 : (n.urgencyScore || 1);
        return getVal(b) - getVal(a);
      }));
    }, (error) => { console.error("Volunteer needs listener error:", error); });

    // 2. Listen for my tasks
    const tasksQ = query(collection(db, "tasks"), where("volunteerId", "==", profile.uid));
    const unsubTasks = onSnapshot(tasksQ, async (snapshot) => {
      const tasks: Task[] = [];
      const needIdsToFetch = new Set<string>();
      
      snapshot.forEach(d => {
        const taskData = { id: d.id, ...d.data() } as Task;
        tasks.push(taskData);
        needIdsToFetch.add(taskData.needId);
      });
      
      tasks.sort((a, b) => {
        if (a.status === 'in_progress' && b.status === 'completed') return -1;
        if (a.status === 'completed' && b.status === 'in_progress') return 1;
        return (b.completedAt || b.acceptedAt) - (a.completedAt || a.acceptedAt);
      });
      
      setMyTasks(tasks);

      // Fetch related needs using functional state update check
      setTaskNeeds(prev => {
        const toFetch = Array.from(needIdsToFetch).filter(nid => !prev[nid]);
        toFetch.forEach(async (nid) => {
          try {
            const snap = await getDoc(doc(db, "needs", nid));
            if (snap.exists()) {
              setTaskNeeds(current => ({ ...current, [nid]: { id: snap.id, ...snap.data() } as Need }));
            }
          } catch(e) {
             console.error("Error fetching task need:", e);
          }
        });
        return prev;
      });
    }, (error) => { console.error("Volunteer tasks listener error:", error); });

    return () => {
      unsubNeeds();
      unsubTasks();
    };
  }, [profile?.uid]);

  const handleAcceptTask = async (needId: string) => {
    if (!profile || loadingAction) return;
    setLoadingAction(true);
    const toastId = toast.loading("Accepting task...");

    try {
      const taskData: Task = {
        needId,
        volunteerId: profile.uid,
        volunteerName: profile.name,
        status: "in_progress",
        acceptedAt: Date.now()
      };

      await addDoc(collection(db, "tasks"), taskData);
      await updateDoc(doc(db, "needs", needId), {
        status: "in_progress",
        assignedVolunteer: profile.uid
      });

      toast.success("Task accepted! Thank you.", { id: toastId });
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(error.message || "Failed to accept task.", { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCompleteTask = async (taskId: string, notes: string) => {
    if (!profile || loadingAction) return;
    setLoadingAction(true);
    const toastId = toast.loading("Marking complete...");

    try {
      const task = myTasks.find(t => t.id === taskId);
      if (!task) throw new Error("Task not found");

      await updateDoc(doc(db, "tasks", taskId), {
        status: "completed",
        notes,
        completedAt: Date.now()
      });

      await updateDoc(doc(db, "needs", task.needId), {
        status: "resolved",
        resolvedAt: Date.now()
      });

      toast.success("Task completed successfully!", { id: toastId });
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(error.message || "Failed to complete task.", { id: toastId });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["volunteer"]}>
      <div className="flex flex-col min-h-screen bg-[#FAFAF9] pb-24 md:pb-0">
        <Navbar />
        
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
          
          <section className="bg-white p-6 rounded-xl border border-[#E5E3DB] shadow-sm">
            <NearbyNGOs />
          </section>

          <section>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">Needs Near You</h1>
              <p className="text-sm sm:text-base text-text-secondary mt-1">
                Showing open requests prioritized by urgency. Your skills and location give you special insights.
              </p>
            </div>
            
            {availableNeeds.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-[#E5E3DB] p-10 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="font-bold text-lg">No open needs right now!</h3>
                <p className="text-text-secondary text-sm">Your community is running smoothly. We&apos;ll notify you when help is needed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableNeeds.map(need => (
                  <NeedCard 
                    key={need.id} 
                    need={need} 
                    actionLabel="Accept Task"
                    onAction={handleAcceptTask}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-black text-foreground">My Active Tasks</h2>
              <p className="text-sm text-text-secondary mt-1">Track your progress and completion notes.</p>
            </div>

            {myTasks.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#E5E3DB] rounded-xl shadow-sm text-text-secondary text-sm">
                You haven&apos;t accepted any tasks yet. <br/>When you do, they will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    need={taskNeeds[task.needId]}
                    onComplete={handleCompleteTask}
                  />
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </ProtectedRoute>
  );
}
