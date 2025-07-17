import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, Target, BookHeart, ArrowRight, ArrowLeft, User, Clock } from "lucide-react";
import { useLocation } from "wouter";

const wellnessGoals = [
  { id: "stress", label: "Manage Stress", icon: "🧘", description: "Reduce daily stress and find calm" },
  { id: "sleep", label: "Better Sleep", icon: "😴", description: "Improve sleep quality and routine" },
  { id: "mood", label: "Improve Mood", icon: "😊", description: "Track and enhance emotional wellbeing" },
  { id: "mindfulness", label: "Mindfulness", icon: "🌸", description: "Develop present-moment awareness" },
  { id: "gratitude", label: "Practice Gratitude", icon: "🙏", description: "Build appreciation and positivity" },
  { id: "energy", label: "Boost Energy", icon: "⚡", description: "Increase vitality and motivation" },
  { id: "anxiety", label: "Reduce Anxiety", icon: "🕊️", description: "Find peace and manage worries" },
  { id: "habits", label: "Build Healthy Habits", icon: "🌱", description: "Create sustainable wellness routines" },
];

const preferredTimes = [
  { id: "morning", label: "Morning", icon: "🌅", time: "6 AM - 12 PM" },
  { id: "afternoon", label: "Afternoon", icon: "☀️", time: "12 PM - 6 PM" },
  { id: "evening", label: "Evening", icon: "🌙", time: "6 PM - 12 AM" },
  { id: "anytime", label: "Anytime", icon: "⏰", time: "Flexible schedule" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [motivation, setMotivation] = useState("");

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest("POST", "/api/auth/update-user-profile", userData);
    },
    onSuccess: () => {
      localStorage.setItem('wellness_onboarding_complete', 'true');
      window.location.href = '/';
    },
    onError: (error) => {
      console.error('Failed to update user profile:', error);
      alert('Failed to save your information. Please try again.');
      // DO NOT mark onboarding as complete if API fails
    }
  });

  const handleComplete = () => {
    if (canComplete) {
      // Get the user ID from localStorage (consistent with App.tsx authentication)
      const deviceId = localStorage.getItem('mindease_user_id');
      
      if (!deviceId) {
        // Fallback: generate a new device ID if none exists
        const newDeviceId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('mindease_user_id', newDeviceId);
        console.log('Generated new device ID for onboarding:', newDeviceId);
      }
      
      const finalDeviceId = deviceId || localStorage.getItem('mindease_user_id');
      
      const userData = {
        name,
        age,
        wellnessGoals: selectedGoals,
        preferredTime,
        motivation,
        deviceId: finalDeviceId, // Include device ID for proper user identification
        onboardingDate: new Date().toISOString()
      };
      
      // Save to localStorage for immediate access
      localStorage.setItem('wellness_user_profile', JSON.stringify(userData));
      
      // Update user profile in database with actual name
      updateUserMutation.mutate(userData);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const canProceedStep1 = name.trim().length >= 2;
  const canProceedStep2 = selectedGoals.length >= 1;
  const canProceedStep3 = preferredTime.length > 0;
  const canComplete = motivation.trim().length >= 10;

  const totalSteps = 4;

  return (
    <div className="flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((step / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Heart className="h-12 w-12 text-pink-500 fill-current" />
                <Sparkles className="h-6 w-6 text-yellow-400 fill-current absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to MindEase
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Let's personalize your wellness journey
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Personal Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <User className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tell us about yourself
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Help us create a personalized experience
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">What's your name?</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your first name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="age">Age (optional)</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter your age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="mt-2"
                      min="13"
                      max="120"
                    />
                  </div>
                </div>

                <Button 
                  onClick={nextStep} 
                  disabled={!canProceedStep1}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Wellness Goals */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    What are your wellness goals?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Select all that apply to you
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {wellnessGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedGoals.includes(goal.id)
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <div className="text-2xl mb-1">{goal.icon}</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {goal.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        {goal.description}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedGoals.length > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Selected: {selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!canProceedStep2}
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Preferred Time */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    When do you prefer to focus on wellness?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    This helps us send you timely reminders
                  </p>
                </div>

                <div className="space-y-3">
                  {preferredTimes.map((time) => (
                    <button
                      key={time.id}
                      onClick={() => setPreferredTime(time.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        preferredTime === time.id
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{time.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {time.label}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            {time.time}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!canProceedStep3}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Motivation */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <BookHeart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    What motivates you most?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Share what drives your wellness journey
                  </p>
                </div>

                <div>
                  <Label htmlFor="motivation">Your motivation</Label>
                  <Textarea
                    id="motivation"
                    placeholder="I want to improve my wellness because..."
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    className="mt-2 min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {motivation.length}/200 characters (minimum 10)
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Your personalized profile:
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p><strong>Name:</strong> {name}</p>
                    {age && <p><strong>Age:</strong> {age}</p>}
                    <p><strong>Goals:</strong> {selectedGoals.length} selected</p>
                    <p><strong>Preferred time:</strong> {preferredTimes.find(t => t.id === preferredTime)?.label}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={prevStep} variant="outline" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button 
                    onClick={handleComplete} 
                    disabled={!canComplete}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
                  >
                    Start My Journey <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}