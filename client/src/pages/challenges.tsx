import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Trophy, Target, Clock, CheckCircle, Star, Calendar, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Challenges() {
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const { toast } = useToast();

  const { data: activeChallenges = [] } = useQuery({
    queryKey: ['/api/challenges/active'],
  });

  const { data: availableChallenges = [] } = useQuery({
    queryKey: ['/api/challenges/available'],
  });

  const { data: completedChallenges = [] } = useQuery({
    queryKey: ['/api/challenges/completed'],
  });

  const joinChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      console.log('Joining challenge with ID:', challengeId);
      try {
        const response = await apiRequest("POST", "/api/challenges/join", { challengeId });
        const data = await response.json();
        console.log('Join challenge response:', data);
        return data;
      } catch (error) {
        console.error('Join challenge API error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Challenge joined successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/available'] });
      toast({
        title: "Challenge started!",
        description: "Good luck on your wellness journey!",
      });
    },
    onError: (error) => {
      console.error("Join challenge error:", error);
      toast({
        title: "Failed to start challenge",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeChallengeeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const response = await apiRequest("POST", "/api/challenges/progress", {
        challengeId,
        completed: true,
        date: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/completed'] });
      toast({
        title: "Great job!",
        description: "You've completed today's challenge!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to mark as complete",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ challengeId, completed }: { challengeId: string; completed: boolean }) => {
      const response = await apiRequest("POST", "/api/challenges/progress", { 
        challengeId, 
        completed,
        date: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/completed'] });
      toast({
        title: "Progress updated!",
        description: "Keep up the great work!",
      });
    },
  });

  const predefinedChallenges = [
    {
      id: "mindful-week",
      title: "7-Day Mindfulness Challenge",
      description: "Practice 5 minutes of mindful breathing daily for one week",
      duration: 7,
      type: "breathing",
      difficulty: "Beginner",
      points: 50,
      icon: "🧘‍♀️",
      benefits: ["Reduced stress", "Better focus", "Improved sleep"]
    },
    {
      id: "gratitude-streak",
      title: "14-Day Gratitude Streak",
      description: "Write 3 things you're grateful for every day for 2 weeks",
      duration: 14,
      type: "gratitude",
      difficulty: "Easy",
      points: 70,
      icon: "🙏",
      benefits: ["Increased happiness", "Better relationships", "Positive mindset"]
    },
    {
      id: "mood-tracker",
      title: "21-Day Mood Awareness",
      description: "Log your mood twice daily and reflect on patterns",
      duration: 21,
      type: "mood",
      difficulty: "Easy",
      points: 80,
      icon: "😊",
      benefits: ["Self-awareness", "Emotional regulation", "Pattern recognition"]
    },
    {
      id: "stress-buster",
      title: "10-Day Stress Relief",
      description: "Use stress management tools daily when feeling overwhelmed",
      duration: 10,
      type: "wellness",
      difficulty: "Intermediate",
      points: 60,
      icon: "🌟",
      benefits: ["Stress reduction", "Coping skills", "Resilience building"]
    },
    {
      id: "self-compassion",
      title: "30-Day Self-Compassion Journey",
      description: "Practice daily self-compassion exercises and positive affirmations",
      duration: 30,
      type: "selfcare",
      difficulty: "Advanced",
      points: 150,
      icon: "💝",
      benefits: ["Self-acceptance", "Reduced self-criticism", "Inner peace"]
    },
    {
      id: "digital-detox",
      title: "Weekend Digital Detox",
      description: "Reduce screen time and practice mindful activities for 48 hours",
      duration: 2,
      type: "lifestyle",
      difficulty: "Intermediate",
      points: 40,
      icon: "📱",
      benefits: ["Better focus", "Real connections", "Mental clarity"]
    }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Beginner': return 'bg-blue-100 text-blue-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (challenge: any) => {
    if (!challenge.progress) return 0;
    return Math.round((challenge.progress.completed / challenge.duration) * 100);
  };

  const getTotalPoints = () => {
    return completedChallenges.reduce((total: number, challenge: any) => total + challenge.points, 0);
  };

  return (
    <div className="pb-20 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 min-h-screen">
      <Navigation />
      
      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-500 to-green-600 text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center space-x-2">
              <Trophy className="w-6 h-6" />
              <span>Wellness Challenges</span>
            </CardTitle>
            <p className="text-blue-100">
              Build healthy habits through fun, achievable goals
            </p>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{activeChallenges.length}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedChallenges.length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{getTotalPoints()}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {activeChallenges.filter((c: any) => getProgressPercentage(c) > 75).length}
              </div>
              <div className="text-sm text-muted-foreground">Near Completion</div>
            </CardContent>
          </Card>
        </div>

        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>Active Challenges</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeChallenges.map((challenge: any) => (
                <div key={challenge.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{challenge.icon}</span>
                      <div>
                        <h3 className="font-semibold">{challenge.title}</h3>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </div>
                    </div>
                    <Badge className={getDifficultyColor(challenge.difficulty)}>
                      {challenge.difficulty}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {challenge.progress?.completed || 0}/{challenge.duration} days</span>
                      <span>{getProgressPercentage(challenge)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(challenge)} className="h-2" />
                  </div>

                  <div className="space-y-3 mt-3">
                    {(challenge.progress?.completed || 0) > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                          <Flame className="w-4 h-4" />
                          Current streak: {challenge.progress?.completed || 0} day{(challenge.progress?.completed || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Star className="w-4 h-4" />
                        <span>{challenge.points} points</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => completeChallengeeMutation.mutate(challenge.challengeId)}
                        disabled={completeChallengeeMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {completeChallengeeMutation.isPending ? "Completing..." : "Complete Today"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Available Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-500" />
              <span>Available Challenges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedChallenges.map((challenge) => (
                <Card key={challenge.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{challenge.icon}</span>
                        <div>
                          <h3 className="font-semibold text-sm">{challenge.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {challenge.duration} days
                            </Badge>
                            <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                              {challenge.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3">{challenge.description}</p>
                    
                    <div className="space-y-2 mb-3">
                      <div className="text-xs font-medium">Benefits:</div>
                      <div className="flex flex-wrap gap-1">
                        {challenge.benefits.map((benefit, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3" />
                        <span>{challenge.points} points</span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedChallenge(challenge)}
                          >
                            Start Challenge
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <span>{challenge.icon}</span>
                              <span>{challenge.title}</span>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>{challenge.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Duration:</span> {challenge.duration} days
                              </div>
                              <div>
                                <span className="font-medium">Difficulty:</span> {challenge.difficulty}
                              </div>
                              <div>
                                <span className="font-medium">Points:</span> {challenge.points}
                              </div>
                              <div>
                                <span className="font-medium">Type:</span> {challenge.type}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium mb-2">Benefits:</div>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {challenge.benefits.map((benefit, index) => (
                                  <li key={index}>{benefit}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline">Cancel</Button>
                              <Button 
                                onClick={() => {
                                  try {
                                    console.log('Starting challenge with ID:', challenge.id);
                                    if (!challenge.id) {
                                      console.error('Challenge ID is undefined or null');
                                      toast({
                                        title: "Error",
                                        description: "Invalid challenge ID",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    joinChallengeMutation.mutate(challenge.id);
                                  } catch (error) {
                                    console.error('Error in Start Challenge button click handler:', error);
                                  }
                                }}
                                disabled={joinChallengeMutation.isPending}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                {joinChallengeMutation.isPending ? 'Starting...' : 'Start Challenge'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Completed Challenges</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedChallenges.map((challenge: any) => (
                  <div key={challenge.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{challenge.icon}</span>
                      <div>
                        <div className="font-medium">{challenge.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Completed on {new Date(challenge.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-600 text-white">
                        +{challenge.points} points
                      </Badge>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}