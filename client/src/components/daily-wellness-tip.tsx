import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, RefreshCw, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function DailyWellnessTip() {
  const [currentTip, setCurrentTip] = useState<string>("");
  const [tipDate, setTipDate] = useState<string>("");

  // Get today's date as string
  const getTodayString = () => {
    return new Date().toDateString();
  };

  // Check if we need a new tip (daily)
  const needsNewTip = () => {
    const storedDate = localStorage.getItem('wellness_tip_date');
    const storedTip = localStorage.getItem('wellness_tip_content');
    const today = getTodayString();
    
    return !storedDate || !storedTip || storedDate !== today;
  };

  // Generate new tip mutation
  const generateTipMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wellness/daily-tip", {
        date: getTodayString()
      });
      return response.json();
    },
    onSuccess: (data) => {
      const today = getTodayString();
      setCurrentTip(data.tip);
      setTipDate(today);
      localStorage.setItem('wellness_tip_content', data.tip);
      localStorage.setItem('wellness_tip_date', today);
    },
  });

  // Load tip on component mount
  useEffect(() => {
    if (needsNewTip()) {
      generateTipMutation.mutate();
    } else {
      const storedTip = localStorage.getItem('wellness_tip_content');
      const storedDate = localStorage.getItem('wellness_tip_date');
      if (storedTip && storedDate) {
        setCurrentTip(storedTip);
        setTipDate(storedDate);
      }
    }
  }, []);

  // Fallback tips for when AI is not available
  const fallbackTips = [
    "Take three deep breaths before checking your phone in the morning. This simple practice helps center your mind for the day ahead.",
    "Practice the 5-4-3-2-1 grounding technique when feeling overwhelmed: Notice 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.",
    "Set aside 10 minutes today for mindful breathing. Even brief moments of focused breathing can significantly reduce stress and anxiety.",
    "Write down three things you're grateful for today. Gratitude practice has been shown to improve mood and overall well-being.",
    "Take a 5-minute walk outside without any distractions. Fresh air and movement can help clear your mind and reset your energy.",
    "Practice self-compassion by speaking to yourself as you would to a dear friend. Be kind and understanding with your inner dialogue.",
    "Try the 'STOP' technique when stressed: Stop what you're doing, Take a breath, Observe your thoughts and feelings, Proceed mindfully."
  ];

  const getRandomFallbackTip = () => {
    const today = new Date().getDate();
    return fallbackTips[today % fallbackTips.length];
  };

  const displayTip = currentTip || getRandomFallbackTip();

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 dark:from-blue-950 dark:to-purple-950 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
          <Lightbulb className="w-5 h-5" />
          <span>Daily Wellness Tip</span>
          <Calendar className="w-4 h-4 ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-blue-900 dark:text-blue-100 leading-relaxed">
              {displayTip}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 dark:text-blue-300">
              {tipDate ? `Updated: ${tipDate}` : 'Today\'s wisdom'}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateTipMutation.mutate()}
              disabled={generateTipMutation.isPending}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${generateTipMutation.isPending ? 'animate-spin' : ''}`} />
              {generateTipMutation.isPending ? 'Generating...' : 'New Tip'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}