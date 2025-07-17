import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mic, MicOff, Volume2, VolumeX, Circle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/navigation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Talk() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [currentMood, setCurrentMood] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const { data: recentMood } = useQuery({
    queryKey: ['/api/mood/recent'],
  });

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        handleVoiceInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice recognition error",
          description: "Please try again or check your microphone permissions.",
          variant: "destructive",
        });
      };
    }

    synthRef.current = window.speechSynthesis;
    setCurrentMood(recentMood?.mood || "");

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [recentMood]);

  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { 
        message,
        isVoice: true,
        currentMood: currentMood 
      });
      return response.json();
    },
    onSuccess: (data) => {
      const assistantMessage = {
        type: 'assistant' as const,
        content: data.response,
        timestamp: new Date(),
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      speakResponse(data.response);
    },
    onError: () => {
      toast({
        title: "Connection failed",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    },
  });

  const handleVoiceInput = (transcript: string) => {
    const userMessage = {
      type: 'user' as const,
      content: transcript,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, userMessage]);
    chatMutation.mutate(transcript);
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    
    // Cancel any ongoing speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice based on mood
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Female')
    ) || voices.find(voice => voice.lang.includes('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Adjust tone based on user's current mood
    switch (currentMood) {
      case 'sad':
      case 'anxious':
        utterance.rate = 0.8;
        utterance.pitch = 0.9;
        break;
      case 'excited':
      case 'happy':
        utterance.rate = 1.1;
        utterance.pitch = 1.1;
        break;
      default:
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice recognition not supported",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
      return;
    }

    setIsListening(true);
    setTranscript("");
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'excited': return 'bg-yellow-100 text-yellow-800';
      case 'happy': return 'bg-green-100 text-green-800';
      case 'calm': return 'bg-blue-100 text-blue-800';
      case 'anxious': return 'bg-orange-100 text-orange-800';
      case 'sad': return 'bg-gray-100 text-gray-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="pb-20 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 min-h-screen">
      <Navigation />
      
      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Voice Assistant</CardTitle>
            <p className="text-blue-100">
              For your support any time
            </p>
            {currentMood && (
              <Badge className={`mx-auto w-fit ${getMoodColor(currentMood)}`}>
                Current mood: {currentMood}
              </Badge>
            )}
          </CardHeader>
        </Card>

        {/* Voice Controls */}
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center space-x-6">
              {/* Listen Button */}
              <div className="flex flex-col items-center space-y-2">
                <Button
                  size="lg"
                  className={`w-20 h-20 rounded-full ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={chatMutation.isPending}
                >
                  {isListening ? (
                    <Square className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                <span className="text-sm font-medium">
                  {isListening ? 'Listening...' : 'Tap to talk'}
                </span>
              </div>

              {/* Speaker Control */}
              <div className="flex flex-col items-center space-y-2">
                <Button
                  size="lg"
                  variant="outline"
                  className={`w-20 h-20 rounded-full ${
                    isSpeaking ? 'animate-pulse border-green-500' : ''
                  }`}
                  onClick={stopSpeaking}
                  disabled={!isSpeaking}
                >
                  {isSpeaking ? (
                    <Volume2 className="w-8 h-8 text-green-600" />
                  ) : (
                    <VolumeX className="w-8 h-8" />
                  )}
                </Button>
                <span className="text-sm font-medium">
                  {isSpeaking ? 'Speaking...' : 'Silent'}
                </span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex justify-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Circle className={`w-3 h-3 fill-current ${
                  isListening ? 'text-red-500' : 'text-gray-300'
                }`} />
                <span>Microphone</span>
              </div>
              <div className="flex items-center space-x-2">
                <Circle className={`w-3 h-3 fill-current ${
                  isSpeaking ? 'text-green-500' : 'text-gray-300'
                }`} />
                <span>Speaker</span>
              </div>
              <div className="flex items-center space-x-2">
                <Circle className={`w-3 h-3 fill-current ${
                  chatMutation.isPending ? 'text-blue-500 animate-pulse' : 'text-gray-300'
                }`} />
                <span>AI Processing</span>
              </div>
            </div>

            {/* Current transcript */}
            {transcript && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>You said:</strong> "{transcript}"
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation History */}
        {conversation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        {conversation.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-gray-600 dark:text-gray-400">
              <h3 className="font-semibold mb-3">Getting Started</h3>
              <div className="space-y-2 text-sm">
                <p>• Tap the microphone and start speaking</p>
                <p>• Your AI assistant will respond with voice and adapt to your mood</p>
                <p>• Ask about stress management, breathing exercises, or just chat</p>
                <p>• The assistant's tone will match your current emotional state</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}