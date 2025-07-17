import React, { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Volume2, VolumeX, Send, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  message: string;
  response: string;
  isUser: boolean;
  timestamp: string;
}

const supportedLanguages = [
  // Global Languages
  { code: 'en', name: 'English', flag: '🇺🇸', region: 'Global' },
  { code: 'es', name: 'Español', flag: '🇪🇸', region: 'Global' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', region: 'Global' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', region: 'Global' },
  { code: 'zh', name: '中文', flag: '🇨🇳', region: 'Global' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', region: 'Global' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', region: 'Global' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', region: 'Global' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', region: 'Global' },
  
  // Indian Languages
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', region: 'India' },
  { code: 'bn', name: 'বাংলা', flag: '🇮🇳', region: 'India' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', region: 'India' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳', region: 'India' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳', region: 'India' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'India' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳', region: 'India' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳', region: 'India' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'India' },
  { code: 'ur', name: 'اردو', flag: '🇮🇳', region: 'India' },
  { code: 'or', name: 'ଓଡ଼ିଆ', flag: '🇮🇳', region: 'India' },
  { code: 'as', name: 'অসমীয়া', flag: '🇮🇳', region: 'India' },
  { code: 'ks', name: 'कॉशुर / کٲشُر', flag: '🇮🇳', region: 'India' }
];

const quickResponses = [
  { 
    en: "How are you feeling today?", hi: "आज आप कैसा महसूस कर रहे हैं?", 
    bn: "আজ আপনি কেমন বোধ করছেন?", ta: "இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?", 
    te: "ఈరోజు మీరు ఎలా అనిపిస్తోంది?", ml: "ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെ തോന്നുന്നു?",
    kn: "ಇಂದು ನೀವು ಹೇಗೆ ಅನಿಸುತ್ತಿದೆ?", gu: "આજે તમને કેવું લાગે છે?",
    mr: "आज तुम्हाला कसे वाटते?", pa: "ਅੱਜ ਤੁਸੀਂ ਕਿਵੇਂ ਮਹਿਸੂਸ ਕਰ ਰਹੇ ਹੋ?",
    or: "ଆଜି ତୁମେ କିପରି ଅନୁଭବ କରୁଛ?", as: "আজি তুমি কেনে অনুভৱ কৰিছা?"
  },
  { 
    en: "Tell me a joke", hi: "मुझे एक जोक सुनाओ", 
    bn: "আমাকে একটা জোক বলো", ta: "எனக்கு ஒரு நகைச்சுவை சொல்லுங்கள்", 
    te: "నాకు ఒక జోక్ చెప్పండి", ml: "എനിക്ക് ഒരു തമാശ പറയൂ",
    kn: "ನನಗೆ ಒಂದು ಹಾಸ್ಯ ಹೇಳಿ", gu: "મને એક મજાક કહો",
    mr: "मला एक विनोद सांगा", pa: "ਮੈਨੂੰ ਇੱਕ ਮਜ਼ਾਕ ਸੁਣਾਓ",
    or: "ମୋତେ ଏକ ରସିକତା କୁହ", as: "মোক এটা ৰসিকতা কোৱা"
  },
  { 
    en: "Help me relax", hi: "आराम करने में मदद करो", 
    bn: "আমাকে শিথিল হতে সাহায্য করো", ta: "எனக்கு ஓய்வெடுக்க உதவுங்கள்", 
    te: "నాకు విశ్రాంతి తీసుకోవడంలో సహాయం చేయండి", ml: "എന്നെ വിശ്രമിക്കാൻ സഹായിക്കൂ",
    kn: "ನನಗೆ ವಿಶ್ರಾಂತಿ ಪಡೆಯಲು ಸಹಾಯ ಮಾಡಿ", gu: "મને આરામ કરવામાં મદદ કરો",
    mr: "मला आराम करण्यात मदत करा", pa: "ਮੈਨੂੰ ਆਰਾਮ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰੋ",
    or: "ମୋତେ ଆରାମ କରିବାରେ ସାହାଯ୍ୟ କର", as: "মোক জিৰণি ল'বলৈ সহায় কৰা"
  },
];

export default function Chat() {
  const [message, setMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize speech synthesis and recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
      
      if ('webkitSpeechRecognition' in window) {
        recognitionRef.current = new (window as any).webkitSpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        
        recognitionRef.current.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          setMessage(speechToText);
          // Auto-send voice messages
          setTimeout(() => {
            if (speechToText.trim()) {
              chatMutation.mutate(speechToText);
            }
          }, 500);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Load saved language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/chat"],
  });

  // Fetch recent mood for context
  const { data: recentMood } = useQuery({
    queryKey: ["/api/mood/recent"],
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      setIsTyping(true);
      
      // Get current user session
      const userId = localStorage.getItem('currentUserId') || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ 
          message: userMessage,
          preferredLanguage: selectedLanguage 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      return await response.json();
    },
    onSuccess: (data: any) => {
      setMessage("");
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      
      // Speak the AI response if voice is enabled
      if (voiceEnabled && data.response) {
        speakText(data.response);
      }
    },
    onError: () => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enhanced multilingual voice synthesis with automatic language detection
  const speakText = (text: string) => {
    if (!synthesisRef.current || !voiceEnabled) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Enhanced language detection for proper voice selection
      const detectLanguageFromText = (text: string): string => {
        // Unicode ranges for different scripts
        const patterns = {
          'hi': /[\u0900-\u097F]/, // Devanagari (Hindi)
          'bn': /[\u0980-\u09FF]/, // Bengali
          'ta': /[\u0B80-\u0BFF]/, // Tamil
          'te': /[\u0C00-\u0C7F]/, // Telugu
          'ml': /[\u0D00-\u0D7F]/, // Malayalam
          'kn': /[\u0C80-\u0CFF]/, // Kannada
          'gu': /[\u0A80-\u0AFF]/, // Gujarati
          'mr': /[\u0900-\u097F]/, // Marathi (Devanagari)
          'pa': /[\u0A00-\u0A7F]/, // Punjabi (Gurmukhi)
          'or': /[\u0B00-\u0B7F]/, // Odia
          'as': /[\u0980-\u09FF]/, // Assamese (Bengali script)
          'ur': /[\u0600-\u06FF]/, // Arabic script (Urdu)
          'ar': /[\u0600-\u06FF]/, // Arabic
          'zh': /[\u4e00-\u9fff]/, // Chinese
          'ja': /[\u3040-\u309F\u30A0-\u30FF\u4e00-\u9fff]/, // Japanese
          'ko': /[\uAC00-\uD7AF]/, // Korean
        };

        for (const [lang, pattern] of Object.entries(patterns)) {
          if (pattern.test(text)) {
            return lang;
          }
        }
        
        // If no specific script detected, use selected language
        return selectedLanguage;
      };

      const detectedLanguage = detectLanguageFromText(text);
      console.log(`Detected language: ${detectedLanguage} for text: ${text.substring(0, 50)}...`);

      // Enhanced voice mapping with better fallbacks
      const voiceLanguageMap: { [key: string]: string[] } = {
        'hi': ['hi-IN', 'hi'],
        'bn': ['bn-IN', 'bn-BD', 'bn'],
        'ta': ['ta-IN', 'ta-LK', 'ta'],
        'te': ['te-IN', 'te'],
        'ml': ['ml-IN', 'ml'],
        'kn': ['kn-IN', 'kn'],
        'gu': ['gu-IN', 'gu'],
        'mr': ['mr-IN', 'mr'],
        'pa': ['pa-IN', 'pa'],
        'or': ['or-IN', 'or'],
        'as': ['as-IN', 'as'],
        'ur': ['ur-IN', 'ur-PK', 'ur'],
        'ks': ['ks-IN', 'ks'],
        'en': ['en-US', 'en-GB', 'en-AU', 'en'],
        'es': ['es-ES', 'es-US', 'es-MX', 'es'],
        'fr': ['fr-FR', 'fr-CA', 'fr'],
        'de': ['de-DE', 'de-AT', 'de'],
        'zh': ['zh-CN', 'zh-TW', 'zh-HK', 'zh'],
        'ja': ['ja-JP', 'ja'],
        'ko': ['ko-KR', 'ko'],
        'ar': ['ar-SA', 'ar-EG', 'ar'],
        'pt': ['pt-BR', 'pt-PT', 'pt']
      };

      // Set the language for the utterance
      const languageCodes = voiceLanguageMap[detectedLanguage] || ['en-US'];
      utterance.lang = languageCodes[0];

      // Get available voices and log them
      const voices = synthesisRef.current!.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));

      // Find the best matching voice
      let preferredVoice = null;
      for (const langCode of languageCodes) {
        preferredVoice = voices.find(voice => 
          voice.lang.toLowerCase().startsWith(langCode.toLowerCase())
        );
        if (preferredVoice) break;
      }

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log(`Using voice: ${preferredVoice.name} (${preferredVoice.lang}) for detected language: ${detectedLanguage}`);
      } else {
        console.log(`No suitable voice found for language: ${detectedLanguage}, using default with lang: ${utterance.lang}`);
      }
      
      // Adjust voice based on current mood and language
      const currentMood = (recentMood as any)?.mood;
      if (currentMood) {
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
      } else {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      }

      utterance.volume = 0.8;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthesisRef.current!.speak(utterance);
    };

    // Wait for voices to load if necessary
    const voices = synthesisRef.current.getVoices();
    if (voices.length === 0) {
      // Voices haven't loaded yet, wait for them
      const handleVoicesChanged = () => {
        synthesisRef.current?.removeEventListener('voiceschanged', handleVoicesChanged);
        speak();
      };
      synthesisRef.current.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Fallback timeout in case voiceschanged doesn't fire
      setTimeout(() => {
        synthesisRef.current?.removeEventListener('voiceschanged', handleVoicesChanged);
        speak();
      }, 1000);
    } else {
      speak();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isTyping) {
      // Update recognition language dynamically when starting
      const languageMap: { [key: string]: string } = {
        'en': 'en-US', 'hi': 'hi-IN', 'bn': 'bn-IN', 'ta': 'ta-IN', 'te': 'te-IN',
        'ml': 'ml-IN', 'kn': 'kn-IN', 'gu': 'gu-IN', 'mr': 'mr-IN', 'pa': 'pa-IN',
        'or': 'or-IN', 'as': 'as-IN', 'ur': 'ur-IN', 'ks': 'ks-IN', 'es': 'es-ES',
        'fr': 'fr-FR', 'de': 'de-DE', 'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
        'ar': 'ar-SA', 'pt': 'pt-BR'
      };
      
      recognitionRef.current.lang = languageMap[selectedLanguage] || 'en-US';
      setMessage("");
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

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim()) return;
    chatMutation.mutate(textToSend);
  };

  const handleQuickResponse = (response: string) => {
    setMessage(response);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('selectedLanguage', selectedLanguage);
  }, [selectedLanguage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 max-w-5xl">
        {/* Header */}
        <div className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MindEase Chat Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Your multilingual wellness companion</p>
            </div>
            
            <div className="flex items-center">
              <Select value={selectedLanguage} onValueChange={(newLang) => {
                setSelectedLanguage(newLang);
                toast({
                  title: `Language changed to ${supportedLanguages.find(l => l.code === newLang)?.name}`,
                  description: "Voice recognition and AI responses will now use this language",
                });
              }}>
                <SelectTrigger className="w-48 h-11 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 rounded-lg">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-gray-200 dark:border-gray-600">
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-gray-600">
                    Global Languages
                  </div>
                  {supportedLanguages.filter(lang => lang.region === 'Global').map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  
                  <div className="px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 border-b border-t border-gray-200 dark:border-gray-600 mt-1">
                    Indian Languages
                  </div>
                  {supportedLanguages.filter(lang => lang.region === 'India').map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
          {/* Messages Area */}
          <div className="h-[550px] overflow-y-auto p-8 space-y-8 scroll-smooth bg-gradient-to-b from-gray-50/30 to-white/50 dark:from-gray-800/30 dark:to-gray-900/50">
            {messages && Array.isArray(messages) && messages.length > 0 ? (
              messages.map((msg: any, index: number) => (
                <div key={`conversation-${index}`} className="space-y-6">
                  {/* User Message */}
                  <div className="flex justify-end items-start gap-4">
                    <div className="group relative">
                      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white rounded-3xl rounded-br-lg px-6 py-4 max-w-xl shadow-xl group-hover:shadow-2xl transform group-hover:scale-[1.02] transition-all duration-300">
                        <p className="text-base leading-relaxed font-medium">{msg.message}</p>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-700 transform rotate-45"></div>
                    </div>
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-lg shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/30">
                      👤
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex justify-start items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-lg shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                      🤖
                    </div>
                    <div className="group relative">
                      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 text-gray-800 dark:text-gray-100 rounded-3xl rounded-bl-lg px-6 py-4 max-w-xl shadow-xl border border-gray-200/50 dark:border-gray-500/50 group-hover:shadow-2xl transform group-hover:scale-[1.02] transition-all duration-300">
                        <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.response}</p>
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white dark:bg-gray-600 border-l border-b border-gray-200/50 dark:border-gray-500/50 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-12 shadow-lg border border-gray-200/30 dark:border-gray-700/30">
                  <div className="text-7xl mb-8 animate-pulse">💬</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent mb-3">
                    Start a conversation
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">Choose a language and begin chatting with your AI assistant</p>
                </div>
              </div>
            )}
            
            {isTyping && (
              <div className="flex justify-start items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-lg shadow-lg ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                  🤖
                </div>
                <div className="group relative">
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-3xl rounded-bl-lg px-6 py-4 shadow-xl border border-gray-200/50 dark:border-gray-500/50">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-3 h-3 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white dark:bg-gray-600 border-l border-b border-gray-200/50 dark:border-gray-500/50 transform rotate-45"></div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Responses */}
          {(!messages || !Array.isArray(messages) || messages.length === 0) && (
            <div className="border-t border-gray-200/30 dark:border-gray-700/30 p-8 bg-gradient-to-r from-blue-50/30 via-indigo-50/30 to-purple-50/30 dark:from-gray-800/30 dark:via-gray-700/30 dark:to-gray-800/30">
              <div className="text-base font-bold text-gray-700 dark:text-gray-200 mb-4">Quick starters:</div>
              <div className="flex flex-wrap gap-4">
                {quickResponses.slice(0, 3).map((responseObj, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer bg-gradient-to-r from-white via-blue-50 to-white dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 hover:from-blue-100 hover:via-blue-200 hover:to-blue-100 dark:hover:from-blue-900/40 dark:hover:via-blue-800/40 dark:hover:to-blue-900/40 text-gray-700 hover:text-blue-800 dark:text-gray-200 dark:hover:text-blue-300 transition-all duration-300 px-6 py-3 rounded-2xl border border-gray-200/60 dark:border-gray-600/60 shadow-lg hover:shadow-xl transform hover:scale-110 hover:-translate-y-1 text-sm font-medium"
                    onClick={() => handleQuickResponse(responseObj[selectedLanguage as keyof typeof responseObj] || responseObj.en)}
                  >
                    {responseObj[selectedLanguage as keyof typeof responseObj] || responseObj.en}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200/30 dark:border-gray-700/30 p-8 bg-gradient-to-r from-white/80 via-blue-50/20 to-white/80 dark:from-gray-800/80 dark:via-gray-700/20 dark:to-gray-800/80 backdrop-blur-sm">
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="relative flex-1">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Type your message in ${supportedLanguages.find(l => l.code === selectedLanguage)?.name}...`}
                  disabled={chatMutation.isPending}
                  className="h-14 bg-white/90 dark:bg-gray-700/90 border-2 border-gray-200/60 dark:border-gray-600/60 rounded-2xl px-6 text-base font-medium placeholder:text-gray-400 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-xl pr-4"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
              </div>
              
              <Button
                onClick={() => handleSendMessage()}
                disabled={!message.trim() || chatMutation.isPending}
                className="h-14 px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-xl font-semibold text-base"
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    <span>Send</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}