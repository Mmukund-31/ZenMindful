import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Settings, Bot, Camera, Smile, MessageCircle, Mic, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MoodSelector from "@/components/mood-selector";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  
  // Get user profile from onboarding
  const userProfile = JSON.parse(localStorage.getItem('wellness_user_profile') || '{"name": "User"}');
  
  const { data: recentMood } = useQuery<any>({
    queryKey: ["/api/mood/recent"],
  });

  const { data: moodHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/mood"],
    staleTime: 0, // Data is always considered stale
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const moodMutation = useMutation({
    mutationFn: async (moodData: { mood: string; emoji: string; rating: number }) => {
      return apiRequest("POST", "/api/mood", moodData);
    },
    onSuccess: () => {
      // Force immediate refresh of mood data for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/insights/personalized"] });
      queryClient.refetchQueries({ queryKey: ["/api/mood"] });
      queryClient.refetchQueries({ queryKey: ["/api/mood/recent"] });
      
      toast({
        title: "Mood logged successfully!",
        description: "Your mood has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log mood. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMoodSelect = (moodData: { mood: string; emoji: string; rating: number }) => {
    moodMutation.mutate(moodData);
  };

  const getMoodLevel = (mood?: string) => {
    const levels = {
      excited: 90,
      happy: 75,
      calm: 60,
      anxious: 40,
      sad: 25,
    };
    return levels[mood as keyof typeof levels] || 50;
  };

  const getMoodDescription = (mood?: string) => {
    const descriptions = {
      excited: "Full of energy and enthusiasm!",
      happy: "Feeling optimistic and energetic today!",
      calm: "Peaceful and centered.",
      anxious: "Feeling a bit worried or stressed.",
      sad: "Having a tough time today.",
    };
    return descriptions[mood as keyof typeof descriptions] || "How are you feeling?";
  };

  return (
    <div className="pb-16 sm:pb-20">
      {/* Header */}
      <header className="gradient-bg text-white p-4 sm:p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold">Hello, {userProfile.name || 'Friend'}</h1>
              <p className="text-xs sm:text-sm opacity-90">How are you feeling today?</p>
            </div>
          </div>
          <Link href="/insights">
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg border-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 hover:shadow-xl p-0"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>

        <MoodSelector onMoodSelect={handleMoodSelect} selectedMood={recentMood?.mood} />
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Today's Wellness */}
        <section className="animate-fade-in">
          <h2 className="text-xl font-semibold text-foreground mb-4">Today's Wellness</h2>

          {/* Current Mood Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 mb-4 mood-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">Current Mood</h3>
                <span className="text-2xl">{recentMood?.emoji || "😌"}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {getMoodDescription(recentMood?.mood)}
              </p>
              <div className="flex items-center space-x-2">
                <Progress value={getMoodLevel(recentMood?.mood)} className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {recentMood?.mood ? "Good" : "-"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <Link href="/chat">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full active:scale-95">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">Chat</h4>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Text conversation</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/talk">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full active:scale-95">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto">
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">Talk</h4>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Voice assistant</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/memories" className="col-span-2 sm:col-span-1">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full active:scale-95">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent/10 rounded-full flex items-center justify-center mb-2 sm:mb-3 mx-auto">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <h4 className="font-medium text-xs sm:text-sm text-foreground">Memory</h4>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Capture moments</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Recent Activities */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {moodHistory.length > 0 ? (
              [...moodHistory]
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((activity: any, index: number) => (
                <Card key={activity.id || index}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                        <span className="text-lg">{activity.emoji}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Mood logged: {activity.mood}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })} at {new Date(activity.timestamp).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No recent activities. Start by logging your mood!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
