import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface VoiceAssistantProps {
  currentMood?: string;
}

export default function VoiceAssistant({ currentMood }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const queryClient = useQueryClient();

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        setTranscript(speechToText);
        handleVoiceMessage(speechToText);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: (data) => {
      setLastResponse(data.response);
      if (voiceEnabled && synthesisRef.current) {
        speakResponse(data.response);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    },
  });

  const handleVoiceMessage = (message: string) => {
    if (message.trim()) {
      chatMutation.mutate(message);
    }
  };

  const speakResponse = (text: string) => {
    if (!synthesisRef.current || !voiceEnabled) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice based on mood
    const voices = synthesisRef.current.getVoices();
    let selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
    
    if (currentMood) {
      // Adjust voice characteristics based on mood
      switch (currentMood.toLowerCase()) {
        case 'anxious':
        case 'stressed':
          utterance.rate = 0.8; // Slower, calming pace
          utterance.pitch = 0.8; // Lower, soothing pitch
          break;
        case 'excited':
        case 'happy':
          utterance.rate = 1.1; // Slightly faster
          utterance.pitch = 1.1; // Higher, more energetic
          break;
        case 'sad':
        case 'lonely':
          utterance.rate = 0.9; // Gentle pace
          utterance.pitch = 0.9; // Warm, comforting tone
          break;
        default:
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled && synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const getMoodBasedGreeting = () => {
    if (!currentMood) return "Hi! I'm here to support you. How are you feeling?";
    
    switch (currentMood.toLowerCase()) {
      case 'anxious':
      case 'stressed':
        return "I can sense you might be feeling anxious. Let's take this moment to breathe together and find some calm.";
      case 'sad':
      case 'lonely':
        return "I'm here with you during this difficult moment. You're not alone, and your feelings are completely valid.";
      case 'angry':
      case 'frustrated':
        return "I understand you're feeling frustrated. Let's work through this together and find a way to release this tension.";
      case 'excited':
      case 'happy':
        return "I love hearing the joy in your energy! Let's celebrate this positive moment and make the most of it.";
      case 'tired':
      case 'exhausted':
        return "It sounds like you need some gentle care right now. Let's focus on what will help you feel more restored.";
      default:
        return "I'm here to listen and support you. What's on your mind today?";
    }
  };

  const isVoiceSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isVoiceSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="text-center p-6">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Voice features are not supported in this browser. Please use text chat instead.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Mic className="w-6 h-6 text-blue-600" />
          <CardTitle className="text-2xl">Voice Assistant</CardTitle>
        </div>
        <CardDescription>
          Speak naturally and I'll respond based on your current mood
        </CardDescription>
        {currentMood && (
          <Badge variant="secondary" className="mx-auto w-fit">
            Current mood: {currentMood}
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Mood-based greeting */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm leading-relaxed">
            {getMoodBasedGreeting()}
          </p>
        </div>

        {/* Voice visualization */}
        <div className="flex justify-center">
          <div className={`relative w-24 h-24 rounded-full border-4 transition-all duration-300 ${
            isListening ? 'border-red-400 bg-red-50 animate-pulse' :
            isSpeaking ? 'border-blue-400 bg-blue-50 animate-pulse' :
            'border-gray-300 bg-gray-50'
          }`}>
            <div className="absolute inset-0 flex items-center justify-center">
              {isListening ? (
                <Mic className="w-8 h-8 text-red-600" />
              ) : isSpeaking ? (
                <Volume2 className="w-8 h-8 text-blue-600" />
              ) : (
                <Mic className="w-8 h-8 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Status and transcript */}
        <div className="text-center space-y-2">
          {isListening && (
            <p className="text-red-600 font-medium">Listening...</p>
          )}
          {isSpeaking && (
            <p className="text-blue-600 font-medium">Speaking...</p>
          )}
          {transcript && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">You said:</p>
              <p className="font-medium">{transcript}</p>
            </div>
          )}
          {lastResponse && !isSpeaking && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Assistant responded:</p>
              <p className="font-medium text-green-800">{lastResponse}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={chatMutation.isPending}
            size="lg"
            variant={isListening ? "destructive" : "default"}
            className="flex items-center space-x-2"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isListening ? 'Stop' : 'Talk'}</span>
          </Button>

          <Button
            onClick={toggleVoice}
            variant="outline"
            size="lg"
            className="flex items-center space-x-2"
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
          </Button>
        </div>

        {chatMutation.isPending && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Processing your message...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}