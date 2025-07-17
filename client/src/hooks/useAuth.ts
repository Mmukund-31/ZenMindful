import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Generate persistent user ID for data continuity
const generateUserId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `user_${timestamp}_${random}`;
};

// Get or create persistent user ID
const getUserId = (): string => {
  let userId = localStorage.getItem('mindease_user_id');
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem('mindease_user_id', userId);
    console.log('Restoring user session:', userId);
  }
  return userId;
};

export function useAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [persistentUserId] = useState(getUserId());

  // Monitor Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Verify and restore user session on mount
  const { data: sessionData } = useQuery({
    queryKey: ["/api/user/verify-session", persistentUserId],
    queryFn: async () => {
      const response = await fetch("/api/user/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": persistentUserId,
        },
        body: JSON.stringify({ userId: persistentUserId }),
      });
      
      if (!response.ok) {
        throw new Error(`Session verification failed: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!persistentUserId,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync with backend when Firebase user changes
  const { data: backendUser } = useQuery({
    queryKey: ["/api/auth/sync", firebaseUser?.uid],
    queryFn: async () => {
      if (!firebaseUser) return null;
      
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": persistentUserId,
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(" ")[0] || "User",
          lastName: firebaseUser.displayName?.split(" ")[1] || "",
          profileImageUrl: firebaseUser.photoURL,
          phoneNumber: firebaseUser.phoneNumber,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!firebaseUser,
    retry: false,
  });

  return {
    user: backendUser?.user || sessionData?.user,
    firebaseUser,
    isLoading: isLoading && !sessionData,
    isAuthenticated: !!firebaseUser || !!sessionData?.success,
    needsOnboarding: backendUser?.needsOnboarding || false,
    persistentUserId,
    sessionRestored: !!sessionData?.success,
  };
}