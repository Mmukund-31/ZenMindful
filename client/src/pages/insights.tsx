import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Lightbulb, Target, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const moodEmojis = {
  happy: "😊",
  calm: "😌",
  anxious: "😰",
  sad: "😢",
  excited: "🤗",
};

export default function Insights() {
  const { data: insightsData, isLoading } = useQuery({
    queryKey: ["/api/insights"],
    staleTime: 30 * 1000, // 30 seconds - refresh more frequently
    refetchOnWindowFocus: true,
  });

  const { data: personalizedInsights, isLoading: isLoadingPersonalized } = useQuery({
    queryKey: ["/api/insights/personalized"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const personalizedData = personalizedInsights as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { insights = [], moodDistribution = [], weeklyData = [], dailyEntries = 0 } = (insightsData as any) || {};

  const getOverallMood = () => {
    if (moodDistribution.length === 0) return { emoji: "😌", label: "No data yet" };
    
    const dominant = moodDistribution.reduce((prev: any, current: any) => 
      prev.percentage > current.percentage ? prev : current
    );
    
    return {
      emoji: moodEmojis[dominant.mood as keyof typeof moodEmojis] || "😌",
      label: `Mostly ${dominant.mood}`,
    };
  };

  const overallMood = getOverallMood();

  return (
    <div className="pb-16 sm:pb-20 p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Mood Insights</h2>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>This Week</span>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{overallMood.emoji}</span>
              <span className="text-sm text-muted-foreground">{overallMood.label}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mood Chart */}
          <div className="h-40 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg flex items-end justify-center space-x-2 p-4">
            {weeklyData.length > 0 ? (
              weeklyData.slice(-7).map((entry: any, index: number) => {
                const height = (entry.rating / 5) * 100;
                const colors = {
                  happy: "bg-secondary",
                  excited: "bg-secondary",
                  calm: "bg-primary",
                  anxious: "bg-accent",
                  sad: "bg-destructive",
                };
                
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className={`rounded-full mb-2 ${colors[entry.mood as keyof typeof colors] || "bg-primary"}`}
                      style={{ width: "8px", height: `${Math.max(height, 10)}px` }}
                    ></div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No mood data yet. Start tracking your mood!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mood Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Mood Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {moodDistribution.length > 0 ? (
            <div className="space-y-3">
              {moodDistribution.map((mood: any) => (
                <div key={mood.mood} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{moodEmojis[mood.mood as keyof typeof moodEmojis]}</span>
                    <span className="text-sm text-foreground capitalize">{mood.mood}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={mood.percentage} className="w-20" />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {mood.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Start logging your mood to see distribution</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personalized AI Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 dark:from-blue-950 dark:to-purple-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Personalized Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPersonalized ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Analyzing your wellness patterns...</p>
            </div>
          ) : personalizedData?.insights && personalizedData.insights.length > 0 ? (
            <div className="space-y-3">
              {personalizedData.insights.map((insight: string, index: number) => (
                <Card key={index} className="bg-white/80 dark:bg-gray-800/80 border-blue-100 dark:border-blue-800">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <Lightbulb className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Personal insights will appear as you use the app features</p>
              <p className="text-xs mt-1">Track moods, capture memories, and practice gratitude to unlock personalized guidance</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Standard AI Insights */}
      <Card className="bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-secondary" />
            </div>
            <span>Pattern Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map((insight: string, index: number) => (
                <Card key={index} className="bg-white/60">
                  <CardContent className="p-3">
                    <p className="text-sm text-foreground">{insight}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Pattern insights will appear as you track your mood over time</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wellness Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Wellness Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-sm text-foreground">Log mood daily</span>
              </div>
              <span className="text-xs text-green-600 font-medium">
                {dailyEntries}/7 days
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Target className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-foreground">Chat with AI assistant</span>
              </div>
              <span className="text-xs text-primary font-medium">In progress</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <Target className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm text-foreground">Add new memories</span>
              </div>
              <span className="text-xs text-accent font-medium">In progress</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
