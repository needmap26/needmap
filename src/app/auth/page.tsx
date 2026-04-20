"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  User 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithGoogle, createDemoGuestSession } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { UserRole } from "@/types";
import toast from "react-hot-toast";

type AuthMethod = "email" | "google";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") as UserRole || "volunteer";
  
  const [method, setMethod] = useState<AuthMethod>("email");
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(defaultRole);
  
  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuthSuccess = async (user: User | { uid: string }) => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      toast.success("Successfully logged in!");
      const userData = userDoc.data();
      router.push(userData.role === 'ngo_admin' ? '/dashboard' : '/volunteer');
    } else {
      // Send to complete profile if they just signed up via Google/Demo
      router.push(`/complete-profile?role=${role}`);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) {
          toast.error("Please verify your email first.");
          await sendEmailVerification(cred.user);
          toast.success("Verification email resent!");
        } else {
          await handleAuthSuccess(cred.user);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        toast.success("Account created! Please check your email to verify.");
        router.push(`/complete-profile?role=${role}`);
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const user = await signInWithGoogle();
      await handleAuthSuccess(user);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Google sign-in failed");
    }
  };

  const handleDemoAuth = async () => {
    setLoading(true);
    try {
      const user = await createDemoGuestSession();
      await handleAuthSuccess(user);
    } catch (error: unknown) {
      toast.error((error as Error).message || "Failed to start demo session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-[#E5E3DB]">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-foreground">
          {isLogin ? "Welcome Back" : "Join NeedMap"}
        </h2>
        <p className="text-text-secondary mt-2">
          {isLogin ? "Log in to your account" : "Create an account to get started"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-lg mb-6 sticky">
        <button
          onClick={() => setMethod("email")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${method === 'email' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
        >
          Email
        </button>
        <button
          onClick={() => setMethod("google")}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${method === 'google' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
        >
          Google & Demo
        </button>
      </div>

      {!isLogin && (
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-1 rounded-lg mb-6">
          <button
            onClick={() => setRole("volunteer")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${role === "volunteer" ? "bg-white text-primary shadow-sm" : "text-text-secondary"}`}
          >
            Volunteer
          </button>
          <button
            onClick={() => setRole("ngo_admin")}
            className={`py-2 text-sm font-medium rounded-md transition-colors ${role === "ngo_admin" ? "bg-white text-primary shadow-sm" : "text-text-secondary"}`}
          >
            NGO Admin
          </button>
        </div>
      )}

      {method === "email" && (
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>
      )}

      {method === "google" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-lg hover:shadow-md transition-all font-medium text-gray-700 bg-white"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continue with Google
          </button>

          <div className="w-full relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-gray-500 font-semibold tracking-wider">Or Quick Demo</span>
            </div>
          </div>
          
          <button
            onClick={handleDemoAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 border-2 border-primary rounded-lg hover:bg-primary/5 transition-all font-bold text-primary bg-white disabled:opacity-70"
          >
           {loading ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> : "Skip Login (Demo Access)"}
          </button>
        </div>
      )}

      <div className="mt-6 text-center border-t border-gray-100 pt-4">
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
          }}
          className="text-primary hover:text-primary-dark font-semibold text-sm"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center space-y-1">
        <p className="text-xs text-gray-400 font-medium">Join 2,400+ volunteers already helping communities</p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>}>
          <AuthContent />
        </Suspense>
      </main>
    </div>
  );
}
