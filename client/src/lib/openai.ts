// This file contains client-side OpenAI utilities
// Note: All actual OpenAI API calls should be made from the server side for security

export interface MoodAnalysis {
  mood: string;
  emoji: string;
  rating: number;
  confidence: number;
}

export interface ChatResponse {
  response: string;
  messageId: number;
}

// Client-side helper functions for OpenAI-related operations
export const analyzeMoodFromText = async (text: string): Promise<MoodAnalysis> => {
  const response = await fetch('/api/mood/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze mood');
  }

  return response.json();
};

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
};
