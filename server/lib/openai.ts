import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeImageAndGenerateMeme(imageBuffer: Buffer, style: string): Promise<{
  topText: string;
  bottomText: string;
  description: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    };

    const stylePrompts = {
      classic: "Create classic internet meme text that's universally funny and relatable",
      modern: "Generate witty, contemporary humor with current internet culture references", 
      funny: "Make it extremely hilarious with maximum comedic impact and absurd humor",
      wholesome: "Create positive, uplifting, and heartwarming meme text that spreads joy"
    };

    const selectedStyle = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.funny;

    const prompt = `Analyze this image and create hilarious meme text for it. ${selectedStyle}.

Rules:
1. Generate TWO pieces of text: TOP text and BOTTOM text
2. Text should be SHORT (max 6 words each)
3. Use ALL CAPS format like classic memes
4. Make it funny based on what you see in the image
5. The humor should relate to the image content, facial expressions, situations, or objects
6. Be creative and use popular meme formats when appropriate

Also provide a brief description of what you see in the image.

Return your response in this exact JSON format:
{
  "topText": "YOUR TOP TEXT HERE",
  "bottomText": "YOUR BOTTOM TEXT HERE", 
  "description": "Brief description of the image"
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    try {
      // Try to parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          topText: parsed.topText || "WHEN YOU SEE THIS",
          bottomText: parsed.bottomText || "INSTANT MEME MATERIAL",
          description: parsed.description || "An interesting image"
        };
      }
    } catch (parseError) {
      console.log("JSON parsing failed, using text extraction");
    }

    // Fallback text extraction
    return {
      topText: "WHEN YOU UPLOAD A PICTURE",
      bottomText: "AND AI MAKES IT FUNNY",
      description: "A user-uploaded image ready for meme transformation"
    };

  } catch (error) {
    console.error("Gemini vision API error:", error);
    return {
      topText: "AI MEME GENERATOR",
      bottomText: "MAKING EVERYTHING FUNNY",
      description: "Image analysis unavailable"
    };
  }
}

// Enhanced multilingual AI response generation with automatic language detection
export async function generateAIResponse(userMessage: string, currentMood?: string, preferredLanguage?: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Enhanced multilingual system prompt with comprehensive Indian language support
    const systemPrompt = `You are MindEase Assistant, a compassionate AI companion focused on mental wellness and emotional support. You can communicate fluently in ALL Indian languages and global languages including:

    INDIAN LANGUAGES (North to South):
    - Hindi (हिंदी), Punjabi (ਪੰਜਾਬੀ), Urdu (اردو), Kashmiri (कॉशुर)
    - Bengali (বাংলা), Assamese (অসমীয়া), Odia (ଓଡ଼ିଆ)
    - Gujarati (ગુજરાતી), Marathi (मराठी)
    - Kannada (ಕನ್ನಡ), Telugu (తెలుగు), Tamil (தமிழ்), Malayalam (മലയാളം)
    
    GLOBAL LANGUAGES:
    - English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic
    
    CRITICAL LANGUAGE INSTRUCTIONS:
    - You MUST respond ENTIRELY in the SAME language as the user's message
    - If user writes in Telugu (తెలుగు), respond ONLY in Telugu using Telugu script
    - If user writes in Hindi (हिंदी), respond ONLY in Hindi using Devanagari script
    - If user writes in Tamil (தமிழ்), respond ONLY in Tamil using Tamil script
    - If user writes in Bengali (বাংলা), respond ONLY in Bengali using Bengali script
    - NEVER mix languages or use English words in your response
    - Use proper Unicode script rendering for each language
    - Use respectful forms: Telugu (మీరు), Hindi (आप), Tamil (நீங்கள்), Bengali (আপনি), etc.
    - Incorporate culturally appropriate expressions and greetings for each Indian language
    - For Indian languages, reference appropriate cultural context (family values, festivals, traditions)
    - Maintain emotional warmth and empathy in all languages
    
    ${currentMood ? `The user's current mood is: ${currentMood}. Tailor your response to be supportive and appropriate for their emotional state.` : ''}
    ${preferredLanguage ? `CRITICAL: User's preferred language is ${preferredLanguage}. You MUST respond ENTIRELY in ${preferredLanguage} script and language.` : ''}
    
    Guidelines:
    - Be empathetic, warm, and supportive in their native language
    - Provide practical wellness advice culturally appropriate to their context
    - Ask thoughtful follow-up questions to encourage reflection
    - Suggest healthy coping strategies relevant to their culture
    - Keep responses conversational and not overly clinical
    - If the user seems distressed, gently suggest professional help
    - Encourage positive activities like connecting with loved ones or viewing happy memories
    - Respect cultural differences in expressing emotions and seeking help`;

    const prompt = `${systemPrompt}\n\nUser message: ${userMessage}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "I'm here to support you. Could you tell me more about how you're feeling?";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "I'm having trouble connecting right now, but I'm here for you. How can I help support your wellness today?";
  }
}

export async function analyzeMoodFromText(text: string): Promise<{
  mood: string;
  emoji: string;
  rating: number;
  confidence: number;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze the emotional tone of the text and determine the primary mood. 
    Respond with JSON in this exact format: 
    { 
      "mood": "one of: happy, sad, anxious, calm, excited", 
      "emoji": "appropriate emoji for the mood",
      "rating": "number from 1-5 representing mood intensity",
      "confidence": "confidence score between 0 and 1"
    }
    
    Text to analyze: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    
    // Parse JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      mood: parsed.mood || "calm",
      emoji: parsed.emoji || "😌",
      rating: Math.max(1, Math.min(5, Math.round(parsed.rating || 3))),
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };
  } catch (error) {
    console.error("Mood analysis error:", error);
    return {
      mood: "calm",
      emoji: "😌",
      rating: 3,
      confidence: 0.5,
    };
  }
}

export async function generateMoodInsights(moodEntries: any[]): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    if (moodEntries.length === 0) {
      return [
        "Start tracking your mood daily to identify patterns and triggers",
        "Regular mood monitoring helps build emotional awareness",
        "Consider setting a daily reminder to check in with yourself"
      ];
    }

    // Analyze patterns including multiple entries per day
    const moodData = moodEntries.map(entry => ({
      mood: entry.mood,
      rating: entry.rating,
      date: new Date(entry.timestamp).toDateString(),
      time: new Date(entry.timestamp).toLocaleTimeString()
    }));

    // Group by date to identify daily patterns
    const dailyPatterns = moodData.reduce((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {} as Record<string, any[]>);

    const multiEntryDays = Object.entries(dailyPatterns).filter(([_, entries]) => entries.length > 1);
    
    const prompt = `Analyze this comprehensive mood tracking data and provide 3-4 supportive insights about patterns, trends, and recommendations.

Total mood entries: ${moodEntries.length}
Days with multiple entries: ${multiEntryDays.length}
${multiEntryDays.length > 0 ? `
Days with mood changes:
${multiEntryDays.map(([date, entries]) => 
  `${date}: ${entries.map(e => `${e.mood}(${e.rating}) at ${e.time}`).join(' → ')}`
).join('\n')}` : ''}

Complete mood data chronologically:
${JSON.stringify(moodData, null, 2)}

Focus on:
- Mood fluctuation patterns within days (if multiple entries exist)
- Overall trends and improvement opportunities  
- Recognition of self-awareness (tracking multiple times shows engagement)
- Actionable recommendations based on observed patterns
- Positive reinforcement for consistent tracking

Respond with JSON in this format: { "insights": ["insight1", "insight2", "insight3", "insight4"] }
Keep insights supportive, specific to the data, and encouraging.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    
    // Parse JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.insights || [
      "Your consistent mood tracking shows great self-awareness",
      "Multiple daily entries indicate thoughtful emotional monitoring",
      "Consider what activities or events correlate with mood changes",
      "Regular tracking helps identify patterns over time"
    ];
  } catch (error) {
    console.error("Insights generation error:", error);
    return [
      "Keep tracking your mood to understand patterns better",
      "Multiple daily entries show excellent self-awareness",
      "Consider what activities help improve your mood"
    ];
  }
}

export async function generateMemeText(memoryTitle: string, memoryCategory: string, style: string): Promise<{
  topText: string;
  bottomText: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `You are a funny meme text generator for a wellness app. Create hilarious, positive, and uplifting meme text based on the memory details.
    
    Guidelines:
    - Keep it funny but wholesome and supportive
    - Use popular meme formats and internet humor
    - Make it relate to mental wellness, happiness, or memories
    - Keep text short and punchy (max 6 words per line)
    - Use ALL CAPS for classic meme style
    
    Respond with JSON in this format: { "topText": "TOP LINE", "bottomText": "BOTTOM LINE" }
    
    Memory: "${memoryTitle}" in category "${memoryCategory}". Style: ${style}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const resultText = response.text();
    
    // Parse JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      topText: parsed.topText || "WHEN YOU SEE",
      bottomText: parsed.bottomText || "THIS HAPPY MEMORY"
    };
  } catch (error) {
    console.error("Meme text generation error:", error);
    // Return fallback based on category
    const fallbacks = {
      family: { topText: "FAMILY TIME HITS", bottomText: "DIFFERENT WHEN HAPPY" },
      friends: { topText: "SQUAD MAKING MEMORIES", bottomText: "INSTANT SEROTONIN BOOST" },
      pets: { topText: "LOOKING AT PET PHOTOS", bottomText: "DEPRESSION WHO?" },
      other: { topText: "GOOD MEMORIES BE LIKE", bottomText: "FREE THERAPY SESSION" }
    };
    return fallbacks[memoryCategory as keyof typeof fallbacks] || fallbacks.other;
  }
}

export async function generateDailyWellnessTip(userContext?: any): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const contextInfo = userContext ? `
    User wellness goals: ${userContext.wellnessGoals?.join(', ') || 'general wellness'}
    Preferred activity time: ${userContext.preferredTime || 'any time'}
    Recent mood patterns: ${userContext.recentMoods?.map((m: { mood: string; rating: number }) => `${m.mood} (${m.rating}/5)`).join(', ') || 'none available'}
    ` : '';

    const prompt = `Generate a personalized daily wellness tip for someone managing stress and overthinking.${contextInfo}
    
    Make it practical, actionable, and supportive. Focus on techniques like mindfulness, breathing, grounding, self-compassion, or gentle movement. 
    Keep it to 1-2 sentences and make it feel personal and encouraging. Today is day ${dayOfYear} of the year.
    
    Return just the tip text, no extra formatting or quotation marks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text().trim() || "Take a moment today to practice deep breathing. Even three mindful breaths can help center your thoughts and reduce stress.";
  } catch (error) {
    console.error("Daily tip generation error:", error);
    throw error;
  }
}

export async function analyzeImageForMemory(base64Image: string): Promise<{
  title: string;
  category: string;
  description: string;
  emotions: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze this image and extract meaningful information for a mental wellness memory app. 
    Look for emotional context, activities, people, locations, and positive elements that could be used for wellness support.
    
    Respond with JSON in this exact format:
    {
      "title": "A meaningful, descriptive title for this memory",
      "category": "one of: family, friends, pets, travel, nature, celebration, personal, other",
      "description": "A warm, positive description of what's happening in the image",
      "emotions": ["array of positive emotions this image might evoke like joy, peace, love, etc"]
    }
    
    Focus on the positive and wellness aspects of the image.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      }
    ]);
    
    const response = await result.response;
    const resultText = response.text();
    
    // Parse JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      title: parsed.title || "Beautiful Memory",
      category: parsed.category || "other",
      description: parsed.description || "A special moment captured in time",
      emotions: parsed.emotions || ["joy", "happiness"]
    };
  } catch (error) {
    console.error("Image analysis error:", error);
    return {
      title: "Beautiful Memory",
      category: "other",
      description: "A special moment captured in time",
      emotions: ["joy", "happiness"]
    };
  }
}

export async function generateMemoryGalleryTitle(memories: any[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const memoryTitles = memories.map(m => m.title).join(", ");
    const categories = Array.from(new Set(memories.map(m => m.category)));
    
    const prompt = `Based on these memory titles and categories, create a beautiful, inspiring gallery title that captures the essence of these memories:
    
    Memory titles: ${memoryTitles}
    Categories: ${categories.join(", ")}
    
    Create a title that:
    - Is 2-6 words long
    - Feels warm and nostalgic
    - Could be used for a photo gallery
    - Relates to mental wellness and positive emotions
    
    Examples: "Moments of Joy", "Family Adventures", "Peaceful Times", "Happy Memories"
    
    Return just the title, no quotes or extra text.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text().trim() || "Beautiful Memories";
  } catch (error) {
    console.error("Gallery title generation error:", error);
    return "Beautiful Memories";
  }
}

export async function generateThoughtInterruptionTechniques(): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Generate 10 unique, effective thought interruption techniques for mental wellness. These should be:
    - Quick and practical (30 seconds to 2 minutes)
    - Evidence-based from CBT and mindfulness practices
    - Suitable for anxiety, stress, and negative thought spirals
    - Easy to remember and implement anywhere
    - Varied in approach (breathing, grounding, cognitive, physical)
    
    Format as a simple list, each technique in 1-2 sentences.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split('\n').filter(line => line.trim().length > 0).slice(0, 10);
  } catch (error) {
    console.error('Error generating thought interruption techniques:', error);
    return [
      "Take 5 deep breaths, counting slowly from 1 to 5 on each inhale and exhale.",
      "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.",
      "Challenge the thought: 'Is this helpful right now? What would I tell a friend thinking this?'",
      "Do 10 jumping jacks or stretch your arms above your head to shift physical energy.",
      "Visualize placing the worry in a box and setting it aside for later."
    ];
  }
}

export async function generatePersonalizedChallenges(userProfile: any, completedChallenges: string[]): Promise<any[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const completedList = completedChallenges.join(', ');
    const goals = userProfile.wellnessGoals || [];
    const motivation = userProfile.motivation || '';
    
    const prompt = `Create 3 personalized wellness challenges based on:
    - Wellness goals: ${goals.join(', ')}
    - Personal motivation: ${motivation}
    - Already completed: ${completedList}
    
    Each challenge should be:
    - 7 days long with daily activities
    - Tailored to their specific goals
    - Progressive difficulty
    - Include mindfulness, physical activity, or emotional wellness
    - Have a catchy title and clear description
    
    Return as JSON array with format:
    [{"id": "unique-id", "title": "Challenge Title", "description": "Brief description", "duration": 7, "category": "mindfulness|physical|emotional", "dailyTasks": ["Task 1", "Task 2", ...]}]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('Error generating personalized challenges:', error);
    return [];
  }
}

export async function generatePersonalizedInsights(userActivity: {
  moodEntries: any[];
  memories: any[];
  chatMessages: any[];
  gratitudeEntries: any[];
  userProfile: any;
}): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const { moodEntries, memories, chatMessages, gratitudeEntries, userProfile } = userActivity;
    
    // Analyze patterns
    const moodPattern = moodEntries.length > 0 ? 
      `${moodEntries.length} mood entries, recent moods: ${moodEntries.slice(-5).map(m => m.mood).join(', ')}` : 
      'No mood tracking yet';
    
    const memoryPattern = memories.length > 0 ? 
      `${memories.length} memories captured, categories: ${Array.from(new Set(memories.map(m => m.category))).join(', ')}` : 
      'No memories captured yet';
    
    const chatPattern = chatMessages.length > 0 ? 
      `${chatMessages.length} chat interactions, active engagement` : 
      'No chat interactions yet';
    
    const gratitudePattern = gratitudeEntries.length > 0 ? 
      `${gratitudeEntries.length} gratitude entries, practicing thankfulness` : 
      'No gratitude practice yet';

    // Extract wellness goals if they exist
    const wellnessGoals = userProfile?.wellnessGoals ? 
      (typeof userProfile.wellnessGoals === 'string' ? 
        JSON.parse(userProfile.wellnessGoals) : userProfile.wellnessGoals) : [];

    const prompt = `Analyze this user's wellness app activity and provide 5 personalized insights based on their goals and patterns.

User Profile:
- Wellness Goals: ${wellnessGoals.join(', ') || 'Not set'}
- Motivation: ${userProfile?.motivation || 'Not provided'}
- Preferred Time: ${userProfile?.preferredTime || 'Not provided'}
- Age: ${userProfile?.age || 'Not provided'}

Activity Patterns:
- Mood tracking: ${moodPattern}
- Memory capture: ${memoryPattern}
- Chat engagement: ${chatPattern}
- Gratitude practice: ${gratitudePattern}

Generate insights that connect their activity patterns to their stated wellness goals, acknowledge progress, and provide specific actionable recommendations.

Respond with JSON: { "insights": ["insight1", "insight2", "insight3", "insight4", "insight5"] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.insights || [
      "Keep exploring the wellness features to track your mental health journey.",
      "Regular mood tracking helps identify patterns and triggers.",
      "Capturing positive memories can boost your overall well-being.",
      "Gratitude practice has been shown to improve mental health.",
      "AI chat support is available whenever you need guidance."
    ];
  } catch (error) {
    console.error('Error generating personalized insights:', error);
    return [
      "Keep exploring the wellness features to track your mental health journey.",
      "Regular mood tracking helps identify patterns and triggers.",
      "Capturing positive memories can boost your overall well-being.",
      "Gratitude practice has been shown to improve mental health.",
      "AI chat support is available whenever you need guidance."
    ];
  }
}

export async function generatePersonalizedThoughtInterruption(userProfile: any, recentMoods: any[]): Promise<string[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const moodContext = recentMoods.length > 0 ? 
      `Recent moods: ${recentMoods.slice(-3).map(m => `${m.mood} (${m.rating}/5)`).join(', ')}` : 
      'No recent mood data';
    
    const wellnessGoals = userProfile?.wellnessGoals ? 
      (typeof userProfile.wellnessGoals === 'string' ? 
        JSON.parse(userProfile.wellnessGoals) : userProfile.wellnessGoals) : [];
    const motivation = userProfile?.motivation || '';

    const prompt = `Create 5 personalized thought interruption techniques for this user based on their profile and recent mood patterns.

User Context:
- Wellness Goals: ${wellnessGoals.join(', ') || 'Not specified'}
- Personal Motivation: ${motivation}
- ${moodContext}

Generate techniques that are:
- Specifically tailored to their goals and recent emotional state
- Quick and practical (30 seconds to 2 minutes)
- Evidence-based from CBT and mindfulness practices
- Easy to remember and implement
- Personalized to their motivation and current needs

Respond with JSON: { "techniques": ["technique1", "technique2", "technique3", "technique4", "technique5"] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.techniques || [
      "Take 5 deep breaths, counting slowly to 4 on each inhale and exhale",
      "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste",
      "Repeat a personal affirmation that aligns with your wellness goals",
      "Do 10 jumping jacks or stretch for 30 seconds to shift your energy",
      "Write down one thing you're grateful for right now"
    ];
  } catch (error) {
    console.error('Error generating personalized thought interruption:', error);
    return [
      "Take 5 deep breaths, counting slowly to 4 on each inhale and exhale",
      "Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste",
      "Repeat a personal affirmation that aligns with your wellness goals",
      "Do 10 jumping jacks or stretch for 30 seconds to shift your energy",
      "Write down one thing you're grateful for right now"
    ];
  }
}