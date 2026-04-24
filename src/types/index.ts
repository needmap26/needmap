export type UserRole = "ngo_admin" | "volunteer" | "ngo";

export interface User {
  uid: string;
  name?: string;
  role?: string;
  profileImage?: string;
  [key: string]: any;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
  profileImage?: string;
  
  // Volunteer specific
  skills?: string[];
  location?: { lat: number; lng: number; city: string; state?: string };
  city?: string;
  state?: string;
  bio?: string;
  totalTasksCompleted?: number;
  totalHoursLogged?: number;
  coins?: number;
  level?: "Newcomer" | "Helper" | "Champion" | "Legend";
  badges?: string[];
  joinedAt?: number;
  lastActiveAt?: number;
  rating?: number;

  // NGO Admin specific
  ngoName?: string;
  coverImage?: string;
  website?: string;
  phone?: string;
  address?: string;
  foundedYear?: number;
  teamSize?: number;
  socialLinks?: { twitter?: string; linkedin?: string; instagram?: string };
  verified?: boolean;
  totalNeedsPosted?: number;
  totalResolved?: number;
  activeVolunteers?: number;
}

export type UrgencyLabel = "critical" | "high" | "medium" | "low";
export type NeedCategory = "food" | "medical" | "shelter" | "education" | "general" | "other";
export type NeedStatus = "pending" | "open" | "in_progress" | "completed";

export interface Need {
  id?: string;
  title: string;
  description: string;
  category: NeedCategory;
  priority?: string; // "emergency" | "medium" | "low"
  isEmergency?: boolean;
  urgencyScore?: number; // legacy 1-10
  urgencyLabel?: UrgencyLabel; // legacy
  location: { lat: number; lng: number; address: string; city: string };
  status: NeedStatus;
  postedBy: string; // uid of NGO admin
  ngoName: string;
  contactNumber?: string;
  assignedVolunteer?: string | null;
  createdAt: number;
  resolvedAt?: number | null;
  peopleAffected: number;
  requiredSkills: string[];
  
  // AI fields
  priorityScore?: number;
  keywords?: string[];
  suggestedAction?: string;
  aiClassified?: boolean;
}

export type TaskStatus = "accepted" | "in_progress" | "completed";

export interface Task {
  id?: string;
  needId: string;
  volunteerId: string;
  volunteerName: string;
  status: TaskStatus;
  acceptedAt: number;
  completedAt?: number | null;
  notes?: string;
  rating?: number;
  feedback?: string;
}

export interface NotificationMsg {
  id?: string;
  uid: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: number;
  relatedId?: string;
}

export interface CoinTransaction {
  id?: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface GlobalStats {
  totalVolunteers: number;
  totalNGOs: number;
  totalResolved: number;
  livesImpacted: number;
  citiesCovered: number;
  lastUpdated: number;
}

export interface Redemption {
  id?: string;
  uid: string;
  rewardId: string;
  cost: number;
  timestamp: number;
}
