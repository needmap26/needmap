"use client";

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { CheckCircle, ExternalLink, Gift, GraduationCap, Shirt, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

const REWARDS_STORE = [
  { id: 'google_cert', name: 'Google Certification', cost: 500, icon: <GraduationCap size={40} className="text-blue-500" />, desc: 'Claim a voucher for Google professional certificates.' },
  { id: 'voucher_cert', name: 'Voucher Certificate', cost: 300, icon: <Gift size={40} className="text-amber-500" />, desc: 'A $10 digital gift card for your community impact.' },
  { id: 'linkedin_badge', name: 'LinkedIn Badge Export', cost: 200, icon: <ExternalLink size={40} className="text-blue-700" />, desc: 'Official NeedMap badge verifiable on LinkedIn.' },
  { id: 'tshirt', name: 'NeedMap T-Shirt', cost: 1000, icon: <Shirt size={40} className="text-emerald-500" />, desc: 'Exclusive NeedMap volunteer t-shirt shipped to you.' },
  { id: 'priority_access', name: 'Priority Task Access', cost: 150, icon: <Zap size={40} className="text-purple-500" />, desc: 'Get notified of critical tasks 15 minutes early.' },
];

export default function RewardsPage() {
  const { user, profile } = useAuth();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<Record<string, any> | null>(null);

  const coins = profile?.coins || 0;

  const handleRedeem = async (reward: { id: string, name: string, cost: number, icon: React.ReactNode, desc: string }) => {
    if (!user) return;
    if (coins < reward.cost) return;

    setLoadingId(reward.id);
    try {
      // Create redemption record
      await addDoc(collection(db, "redemptions"), {
        uid: user.uid,
        rewardId: reward.id,
        rewardName: reward.name,
        cost: reward.cost,
        timestamp: serverTimestamp()
      });

      // Deduct coins
      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-reward.cost)
      });
      
      // Also log the deduction in coinTransactions
      await addDoc(collection(db, "users", user.uid, "coinTransactions"), {
        amount: -reward.cost,
        reason: `Redeemed ${reward.name}`,
        timestamp: serverTimestamp()
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10B981', '#F59E0B', '#3B82F6']
      });

      setSuccessModal(reward);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Redemption failed");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />

      <div className="bg-gradient-to-r from-emerald-900 to-primary pt-12 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-6">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Rewards Store</h1>
            <p className="text-emerald-50 text-xl max-w-2xl">
              Turn your community impact into tangible rewards. Thank you for making a difference!
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
            <p className="text-emerald-100 font-medium mb-1 uppercase tracking-wider text-sm">Your Balance</p>
            <div className="text-5xl font-black text-white flex items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-amber-900 text-2xl mb-1 shadow-lg border-2 border-amber-200">C</div>
              {coins}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {REWARDS_STORE.map(reward => {
            const canAfford = coins >= reward.cost;
            
            return (
              <div key={reward.id} className="bg-white rounded-2xl border border-[#E5E3DB] shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col relative overflow-hidden group">
                {/* Decorative background circle */}
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                
                <div className="relative z-10">
                  <div className="mb-4">
                    {reward.icon}
                  </div>
                  <h3 className="font-bold text-xl text-foreground mb-2 leading-tight">{reward.name}</h3>
                  <p className="text-sm text-text-secondary mb-6 flex-1">
                    {reward.desc}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 font-bold text-amber-500">
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-[10px]">C</div>
                      {reward.cost}
                    </div>
                    
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford || loadingId === reward.id}
                      className={`px-5 py-2 rounded-lg font-bold transition-all ${
                        !canAfford 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow'
                      }`}
                    >
                      {loadingId === reward.id ? (
                         <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        canAfford ? 'Redeem' : 'Need more coins'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2">Success!</h3>
            <p className="text-text-secondary mb-6">
              You&apos;ve successfully redeemed <strong className="text-foreground">{successModal.name as string}</strong>. We&apos;ve sent the details to your registered email address.
            </p>
            <button
              onClick={() => setSuccessModal(null)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-foreground font-bold rounded-xl transition-colors"
            >
              Back to Store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
