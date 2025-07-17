import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Heart, Calendar, TrendingUp, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/navigation";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Gratitude() {
  const [newEntry, setNewEntry] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: gratitudeEntries = [] } = useQuery({
    queryKey: ['/api/gratitude'],
  });

  const { data: gratitudeInsights } = useQuery({
    queryKey: ['/api/gratitude/insights'],
  });

  const createEntryMutation = useMutation({
    mutationFn: async (entry: string) => {
      const response = await apiRequest("POST", "/api/gratitude", { 
        content: entry,
        date: new Date().toISOString()
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gratitude'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gratitude/insights'] });
      setNewEntry("");
      setIsDialogOpen(false);
      toast({
        title: "Gratitude entry saved!",
        description: "Your grateful moment has been recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save entry",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (newEntry.trim()) {
      createEntryMutation.mutate(newEntry.trim());
    }
  };

  const todaysPrompts = [
    "What made you smile today?",
    "Who are you thankful for right now?",
    "What small moment brought you joy?",
    "What challenge helped you grow?",
    "What comfort or support do you appreciate?"
  ];

  const getRandomPrompt = () => {
    const today = new Date().getDate();
    return todaysPrompts[today % todaysPrompts.length];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStreakCount = () => {
    if (!gratitudeEntries.length) return 0;
    
    let streak = 1;
    const sortedEntries = [...gratitudeEntries].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    for (let i = 1; i < sortedEntries.length; i++) {
      const current = new Date(sortedEntries[i].date);
      const previous = new Date(sortedEntries[i-1].date);
      const diffDays = Math.ceil((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  return (
    <div className="pb-20 bg-gradient-to-b from-pink-50 to-white dark:from-pink-950 dark:to-gray-900 min-h-screen">
      <Navigation />
      
      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center space-x-2">
              <Heart className="w-6 h-6" />
              <span>Gratitude Journal</span>
            </CardTitle>
            <p className="text-pink-100">
              Cultivate appreciation and discover daily joy
            </p>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-pink-600">{gratitudeEntries.length}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{getStreakCount()}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.ceil(gratitudeEntries.length / 7)}
              </div>
              <div className="text-sm text-muted-foreground">Weeks Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Entry */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Gratitude</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Daily prompt: "{getRandomPrompt()}"
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-pink-500 hover:bg-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>What are you grateful for today?</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Today's prompt: "{getRandomPrompt()}"
                      </p>
                      <Textarea
                        placeholder="I'm grateful for..."
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={!newEntry.trim() || createEntryMutation.isPending}
                        className="bg-pink-500 hover:bg-pink-600"
                      >
                        {createEntryMutation.isPending ? 'Saving...' : 'Save Entry'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* AI Insights */}
        {gratitudeInsights && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span>Your Gratitude Patterns</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gratitudeInsights.patterns?.map((pattern: string, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{pattern}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <span>Recent Entries</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gratitudeEntries.length > 0 ? (
              gratitudeEntries.slice(0, 10).map((entry: any) => (
                <div key={entry.id} className="border-l-4 border-pink-300 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDate(entry.date)}
                    </Badge>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{entry.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-pink-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  Start Your Gratitude Journey
                </h3>
                <p className="text-gray-500 dark:text-gray-500 mb-4">
                  Begin by recording one thing you're grateful for today
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  Write First Entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}