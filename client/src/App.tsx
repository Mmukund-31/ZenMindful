import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from "react";
import { apiRequest } from "./lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import Navigation from "@/components/navigation";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Talk from "@/pages/talk";
import Memories from "@/pages/memories";
import Insights from "@/pages/insights";
import Wellness from "@/pages/wellness";
import Gratitude from "@/pages/gratitude";
import Challenges from "@/pages/challenges";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";
import DatabaseAdmin from "@/pages/database-admin";
import NotFound from "@/pages/not-found";


function Router() {
  // Enhanced persistent user authentication system
  const initializeUser = useMutation({
    mutationFn: async () => {
      // Check for existing user ID in localStorage
      const existingUserId = localStorage.getItem('mindease_user_id');
      
      if (existingUserId) {
        console.log('Restoring user session:', existingUserId);
        // Verify existing user and restore session
        return apiRequest("POST", "/api/user/verify-session", { userId: existingUserId });
      } else {
        // Create new user with unique timestamp-based ID
        const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('Creating new user:', newUserId);
        // Store immediately to prevent duplicate creation
        localStorage.setItem('mindease_user_id', newUserId);
        return apiRequest("POST", "/api/user/create", { userId: newUserId });
      }
    },
    onSuccess: (data: any) => {
      if (data.success && data.userId) {
        // Ensure userId is stored in localStorage
        localStorage.setItem('mindease_user_id', data.userId);
        console.log('User session established:', data.userId);
        
        // Force cache invalidation to refresh all queries with new auth
        queryClient.invalidateQueries();
      }
    },
    onError: (error) => {
      console.error('User initialization failed:', error);
      localStorage.removeItem('mindease_user_id');
    }
  });

  useEffect(() => {
    initializeUser.mutate();
  }, []);

  // Check onboarding status
  const hasCompletedOnboarding = localStorage.getItem('wellness_onboarding_complete') === 'true';

  if (!hasCompletedOnboarding) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/talk" component={Talk} />
        <Route path="/memories" component={Memories} />
        <Route path="/insights" component={Insights} />
        <Route path="/wellness" component={Wellness} />
        <Route path="/gratitude" component={Gratitude} />
        <Route path="/challenges" component={Challenges} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/admin/database" component={DatabaseAdmin} />
      </Switch>
      <Navigation />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="mindease-ui-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="max-w-md mx-auto bg-white shadow-2xl min-h-screen relative overflow-hidden">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
