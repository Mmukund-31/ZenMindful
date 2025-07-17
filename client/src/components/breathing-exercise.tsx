import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";

interface BreathingExerciseProps {
  onComplete?: () => void;
}

export default function BreathingExercise({ onComplete }: BreathingExerciseProps) {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [progress, setProgress] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(4);

  // 4-7-8 breathing pattern (4 seconds inhale, 7 seconds hold, 8 seconds exhale)
  const phases = {
    inhale: { duration: 4, next: 'hold', instruction: 'Breathe in slowly through your nose' },
    hold: { duration: 7, next: 'exhale', instruction: 'Hold your breath gently' },
    exhale: { duration: 8, next: 'pause', instruction: 'Exhale slowly through your mouth' },
    pause: { duration: 2, next: 'inhale', instruction: 'Rest and prepare for the next breath' }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive) {
      const currentPhase = phases[phase];
      const stepDuration = (currentPhase.duration * 1000) / 100; // 100 steps per phase

      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Move to next phase
            const nextPhase = currentPhase.next as keyof typeof phases;
            setPhase(nextPhase);
            setTimeRemaining(phases[nextPhase].duration);
            
            if (nextPhase === 'inhale') {
              setCycleCount(count => {
                const newCount = count + 1;
                if (newCount >= 4) { // Complete after 4 cycles
                  setIsActive(false);
                  onComplete?.();
                }
                return newCount;
              });
            }
            return 0;
          }
          
          const newProgress = prev + 1;
          const remaining = Math.ceil((100 - newProgress) * stepDuration / 1000);
          setTimeRemaining(remaining);
          return newProgress;
        });
      }, stepDuration);
    }

    return () => clearInterval(interval);
  }, [isActive, phase, cycleCount, onComplete]);

  const toggleExercise = () => {
    setIsActive(!isActive);
  };

  const resetExercise = () => {
    setIsActive(false);
    setPhase('inhale');
    setProgress(0);
    setCycleCount(0);
    setTimeRemaining(4);
  };

  const getCircleScale = () => {
    if (phase === 'inhale') return 0.5 + (progress / 200); // Grow from 0.5 to 1
    if (phase === 'hold') return 1; // Stay at 1
    if (phase === 'exhale') return 1 - (progress / 200); // Shrink from 1 to 0.5
    return 0.5; // Pause phase
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Breathing Exercise</CardTitle>
        <CardDescription>4-7-8 breathing pattern for relaxation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Breathing Circle */}
        <div className="flex justify-center items-center h-64">
          <div 
            className={`w-48 h-48 rounded-full border-4 transition-all duration-1000 ease-in-out ${
              phase === 'inhale' ? 'border-blue-400 bg-blue-50' :
              phase === 'hold' ? 'border-purple-400 bg-purple-50' :
              phase === 'exhale' ? 'border-green-400 bg-green-50' :
              'border-gray-400 bg-gray-50'
            }`}
            style={{ 
              transform: `scale(${getCircleScale()})`,
              boxShadow: `0 0 30px ${
                phase === 'inhale' ? 'rgba(59, 130, 246, 0.3)' :
                phase === 'hold' ? 'rgba(147, 51, 234, 0.3)' :
                phase === 'exhale' ? 'rgba(34, 197, 94, 0.3)' :
                'rgba(107, 114, 128, 0.3)'
              }`
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <div className="text-lg font-semibold capitalize mb-2">
                {phase}
              </div>
              <div className="text-3xl font-bold mb-2">
                {timeRemaining}
              </div>
              <div className="text-sm text-gray-600 px-4">
                {phases[phase].instruction}
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Cycle {cycleCount + 1} of 4</span>
            <span className="capitalize">{phase} Phase</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={toggleExercise}
            variant={isActive ? "secondary" : "default"}
            size="lg"
            className="flex items-center space-x-2"
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isActive ? 'Pause' : 'Start'}</span>
          </Button>
          
          <Button
            onClick={resetExercise}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Reset</span>
          </Button>
        </div>

        {cycleCount >= 4 && (
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">🎉 Breathing exercise complete!</p>
            <p className="text-green-600 text-sm mt-1">You should feel more calm and centered now.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}