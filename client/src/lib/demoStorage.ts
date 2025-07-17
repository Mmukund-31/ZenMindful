// Demo storage for local testing without backend
export class DemoStorage {
  private getStorageKey(key: string): string {
    return `mindease_demo_${key}`;
  }

  private getData<T>(key: string): T[] {
    const data = localStorage.getItem(this.getStorageKey(key));
    return data ? JSON.parse(data) : [];
  }

  private setData<T>(key: string, data: T[]): void {
    localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
  }

  // Mood operations
  addMoodEntry(mood: any) {
    const moods = this.getData('moods');
    const newMood = {
      ...mood,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    moods.unshift(newMood);
    this.setData('moods', moods);
    return newMood;
  }

  getMoods() {
    return this.getData('moods');
  }

  getRecentMood() {
    const moods = this.getData('moods');
    return moods[0] || null;
  }

  // Memory operations
  addMemory(memory: any) {
    const memories = this.getData('memories');
    const newMemory = {
      ...memory,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    memories.unshift(newMemory);
    this.setData('memories', memories);
    return newMemory;
  }

  getMemories(category?: string) {
    const memories = this.getData('memories');
    if (category && category !== 'all') {
      return memories.filter((m: any) => m.category === category);
    }
    return memories;
  }

  updateMemoryFavorite(id: number, isFavorite: boolean) {
    const memories = this.getData('memories');
    const memory = memories.find((m: any) => m.id === id);
    if (memory) {
      memory.isFavorite = isFavorite;
      this.setData('memories', memories);
    }
    return memory;
  }

  // Chat operations
  addChatMessage(message: any) {
    const messages = this.getData('chat');
    const newMessage = {
      ...message,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    messages.push(newMessage);
    this.setData('chat', messages);
    return newMessage;
  }

  getChatMessages() {
    return this.getData('chat');
  }

  // Insights
  getInsights() {
    const moods = this.getData('moods');
    const moodCounts = moods.reduce((acc: any, mood: any) => {
      acc[mood.mood] = (acc[mood.mood] || 0) + 1;
      return acc;
    }, {});

    const total = moods.length || 1;
    const moodDistribution = Object.entries(moodCounts).map(([mood, count]: [string, any]) => ({
      mood,
      percentage: Math.round((count / total) * 100)
    }));

    return {
      insights: [
        "You're building a great habit of tracking your mood!",
        "Keep exploring your emotional patterns",
        "Remember that every feeling is valid and temporary"
      ],
      moodDistribution,
      totalEntries: moods.length,
      weeklyData: moods.slice(-7).reverse()
    };
  }
}

export const demoStorage = new DemoStorage();