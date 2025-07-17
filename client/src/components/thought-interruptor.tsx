import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, RefreshCw, Brain, Heart, Star, Sparkles } from "lucide-react";

interface ThoughtInterruptorProps {
  onComplete?: () => void;
}

const interruptionTechniques = [
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding',
    icon: <Brain className="w-5 h-5" />,
    description: 'Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste',
    action: 'Start Grounding',
    steps: [
      'Look around and name 5 things you can see',
      'Listen carefully and name 4 things you can hear',
      'Touch 3 different objects and focus on their texture',
      'Identify 2 things you can smell',
      'Notice 1 thing you can taste'
    ]
  },
  {
    id: 'physical',
    title: 'Physical Reset',
    icon: <Zap className="w-5 h-5" />,
    description: 'Quick physical movements to break the thought cycle',
    action: 'Do Physical Reset',
    steps: [
      'Stand up and stretch your arms above your head',
      'Do 10 jumping jacks or march in place',
      'Take 3 deep breaths with your arms wide',
      'Shake out your hands and feet',
      'Roll your shoulders back and smile'
    ]
  },
  {
    id: 'cognitive',
    title: 'Thought Challenge',
    icon: <RefreshCw className="w-5 h-5" />,
    description: 'Question and reframe negative thoughts',
    action: 'Challenge Thoughts',
    steps: [
      'Is this thought based on facts or feelings?',
      'What would I tell a friend in this situation?',
      'What\'s the most likely realistic outcome?',
      'How will this matter in 5 years?',
      'What\'s one small step I can take right now?'
    ]
  },
  {
    id: 'gratitude',
    title: 'Gratitude Shift',
    icon: <Heart className="w-5 h-5" />,
    description: 'Redirect focus to positive aspects of life',
    action: 'Practice Gratitude',
    steps: [
      'Name something you\'re grateful for today',
      'Think of someone who cares about you',
      'Recall a recent moment that made you smile',
      'Appreciate something in your current environment',
      'Acknowledge one thing your body does well'
    ]
  },
  {
    id: 'visualization',
    title: 'Safe Place Visualization',
    icon: <Star className="w-5 h-5" />,
    description: 'Mental escape to a calm, safe environment',
    action: 'Visualize Safety',
    steps: [
      'Close your eyes and imagine your safe place',
      'What do you see around you in this place?',
      'What sounds do you hear?',
      'How does this place smell?',
      'Feel the peace and safety of this moment'
    ]
  }
];

export default function ThoughtInterruptor({ onComplete }: ThoughtInterruptorProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<typeof interruptionTechniques[0] | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [useAITechniques, setUseAITechniques] = useState(false);

  // Fetch AI-powered techniques every 3 days
  const { data: aiTechniques, refetch: refetchTechniques } = useQuery({
    queryKey: ["/api/wellness/thought-interruption"],
    staleTime: 3 * 24 * 60 * 60 * 1000, // 3 days
    enabled: useAITechniques,
  });

  // Check if we should refresh AI techniques (every 3 days)
  useEffect(() => {
    const lastRefresh = localStorage.getItem('thoughtTechniquesLastRefresh');
    const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
    
    if (!lastRefresh || parseInt(lastRefresh) < threeDaysAgo) {
      setUseAITechniques(true);
      localStorage.setItem('thoughtTechniquesLastRefresh', Date.now().toString());
    }
  }, []);

  const startTechnique = (technique: typeof interruptionTechniques[0]) => {
    setSelectedTechnique(technique);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (selectedTechnique && currentStep < selectedTechnique.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTechnique();
    }
  };

  const completeTechnique = () => {
    setIsActive(false);
    setSelectedTechnique(null);
    setCurrentStep(0);
    onComplete?.();
  };

  const resetInterruptor = () => {
    setIsActive(false);
    setSelectedTechnique(null);
    setCurrentStep(0);
  };

  const refreshTechniques = () => {
    // Reset to show available techniques
    setSelectedTechnique(null);
    setIsActive(false);
    setCurrentStep(0);
    
    // Refresh AI techniques if enabled
    if (useAITechniques) {
      refetchTechniques();
      localStorage.setItem('thoughtTechniquesLastRefresh', Date.now().toString());
    }
  };

  // Combine static and AI techniques
  const aiTechniquesList = useAITechniques && aiTechniques ? (aiTechniques as { techniques: string[] }).techniques : [];
  const allTechniques = [
    ...interruptionTechniques,
    ...aiTechniquesList.map((tech: string, index: number) => ({
      id: `ai-${index}`,
      title: `AI Technique ${index + 1}`,
      icon: <Sparkles className="w-5 h-5" />,
      description: tech,
      action: 'Try This',
      steps: [tech]
    }))
  ];

  if (isActive && selectedTechnique) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            {selectedTechnique.icon}
            <CardTitle className="text-xl">{selectedTechnique.title}</CardTitle>
          </div>
          <CardDescription>
            Step {currentStep + 1} of {selectedTechnique.steps.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <p className="text-lg font-medium text-blue-900 mb-4">
              {selectedTechnique.steps[currentStep]}
            </p>
            <p className="text-sm text-blue-700">
              Take your time with this step. When you're ready, continue.
            </p>
          </div>

          <div className="flex justify-center space-x-4">
            {currentStep < selectedTechnique.steps.length - 1 ? (
              <Button onClick={nextStep} size="lg" className="px-8">
                Next Step
              </Button>
            ) : (
              <Button onClick={completeTechnique} size="lg" className="px-8 bg-green-600 hover:bg-green-700">
                Complete
              </Button>
            )}
            
            <Button onClick={resetInterruptor} variant="outline" size="lg">
              Start Over
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="flex space-x-2">
              {selectedTechnique.steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Thought Interruption Tools</CardTitle>
        <CardDescription>
          Break the cycle of overthinking with these quick techniques
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Available Techniques</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseAITechniques(!useAITechniques)}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {useAITechniques ? 'Use Standard' : 'Use AI'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTechniques}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTechniques.map((technique) => (
            <Card 
              key={technique.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
              onClick={() => startTechnique(technique)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {technique.icon}
                    <h3 className="font-semibold text-lg">{technique.title}</h3>
                  </div>
                  <Badge variant="secondary">2-5 min</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-4">
                  {technique.description}
                </p>
                <Button className="w-full" variant="outline">
                  {technique.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-amber-800 text-sm">
            💡 <strong>Tip:</strong> The goal isn't to eliminate thoughts, but to interrupt negative spirals 
            and redirect your mental energy toward the present moment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}