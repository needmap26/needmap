"use client";

import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { linkGoogle } from "@/lib/auth";
import { AlertTriangle, Shield, Check, MapPin, Trash2, UserIcon } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile Form state
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [privacy, setPrivacy] = useState(true);

  // Providers linked
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setCity(profile.city || profile.address || "");
    }
    if (user) {
      setLinkedProviders(user.providerData.map(p => p.providerId));
    }
  }, [profile, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        bio,
        city,
        address: city,
        isPublic: privacy
      });
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    try {
      await linkGoogle();
      toast.success("Google account linked securely.");
      if (user) {
        setLinkedProviders(user.providerData.map(p => p.providerId));
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to link Google account.");
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.error("Account deletion is disabled in this demo.");
    }
  };

  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
      <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-black text-foreground mb-8">Account Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <UserIcon size={18} />
                Profile Information
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <Shield size={18} />
                Security & Accounts
              </button>
              <button 
                onClick={() => setActiveTab('danger')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-red-600 hover:bg-red-50`}
              >
                <AlertTriangle size={18} />
                Danger Zone
              </button>
            </nav>
          </div>
          
          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E3DB] overflow-hidden">
              {activeTab === 'profile' && (
                <div className="p-8">
                  <h2 className="text-xl font-bold mb-6 border-b pb-4">Profile Information</h2>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
                      <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell the community about yourself..."
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">City / Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                      <div>
                        <p className="font-bold text-foreground">Public Profile</p>
                        <p className="text-sm text-text-secondary">Make your profile visible to NGOs and volunteers.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={privacy} onChange={() => setPrivacy(!privacy)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 flex items-center gap-2"
                    >
                      {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Check size={18} />}
                      Save Changes
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-8">
                  <h2 className="text-xl font-bold mb-6 border-b pb-4">Linked Accounts</h2>
                  <p className="text-sm text-text-secondary mb-6 max-w-xl">
                    Link multiple sign-in methods to your account so you can log in using any of them.
                  </p>

                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center text-primary font-bold">@</div>
                        <div>
                          <p className="font-bold text-foreground">Email</p>
                          <p className="text-sm text-gray-500">{user.email || 'Not connected'}</p>
                        </div>
                      </div>
                      {linkedProviders.includes('password') && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">Connected</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white shadow-sm rounded-full flex items-center justify-center font-bold text-blue-500">G</div>
                        <div>
                          <p className="font-bold text-foreground">Google</p>
                          <p className="text-sm text-gray-500">Sign in with Google</p>
                        </div>
                      </div>
                      {linkedProviders.includes('google.com') ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">Connected</span>
                      ) : (
                        <button onClick={handleLinkGoogle} className="text-sm font-bold text-primary hover:text-primary-dark">
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'danger' && (
                <div className="p-8">
                  <h2 className="text-xl font-bold mb-6 border-b pb-4 text-red-600 flex items-center gap-2">
                    <AlertTriangle />
                    Danger Zone
                  </h2>
                  <p className="text-sm text-text-secondary mb-6 max-w-xl">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>

                  <div className="p-6 bg-red-50 border border-red-100 rounded-xl max-w-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-red-800">Delete Account</p>
                      <p className="text-sm text-red-600 mt-1">Permanently remove your data.</p>
                    </div>
                    <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition flex items-center gap-2 shadow-sm">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
