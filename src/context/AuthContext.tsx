"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          
          if (unsubProfile) unsubProfile(); // Clean up previous listener
          
          unsubProfile = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data() as UserProfile;
              if (userData.role === "ngo") {
                const ngoDoc = await getDoc(doc(db, "ngos", firebaseUser.uid));
                userData.hasNgoProfile = ngoDoc.exists();
              } else {
                userData.hasNgoProfile = true;
              }
              setProfile(userData);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            console.error("Error fetching user profile:", error);
            setProfile(null);
            setLoading(false);
          });
          
        } catch (error) {
          console.error("Error setting up profile listener:", error);
          setProfile(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Global route protection for incomplete NGO profiles
  useEffect(() => {
    if (!loading && profile && profile.role === "ngo" && profile.hasNgoProfile === false) {
      if (window.location.pathname !== "/complete-profile") {
        router.push("/complete-profile");
      }
    }
  }, [loading, profile, router]);

  const logout = async () => {
    try {
      await auth.signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth");
      } else if (profile && allowedRoles && !allowedRoles.includes(profile.role)) {
        router.push("/");
      }
    }
  }, [user, profile, loading, router, allowedRoles]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div></div>;
  }

  if (!user) return null;
  if (profile && allowedRoles && !allowedRoles.includes(profile.role)) return null;

  return <>{children}</>;
};
