import { useState } from "react";
import { Sparkles, Calendar, Users, Heart, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AutoMemoryCreatorProps {
  memories: Array<{
    id: number;
    title: string;
    imageUrl: string;
    category: string;
    createdAt: string;
  }>;
  onCreateMemory: (photos: any[], title: string) => void;
}

export default function AutoMemoryCreator({ memories, onCreateMemory }: AutoMemoryCreatorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createSmartMemory = async () => {
    if (memories.length < 3) {
      toast({
        title: "Need more photos",
        description: "Upload at least 3 photos to create AI-powered galleries",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Group memories by category for intelligent selection
      const categoryGroups = memories.reduce((acc, memory) => {
        const cat = memory.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(memory);
        return acc;
      }, {} as Record<string, typeof memories>);

      // Find best category or use random selection
      const populatedCategories = Object.entries(categoryGroups).filter(([_, mems]) => mems.length >= 2);
      
      let selectedPhotos;
      if (populatedCategories.length > 0) {
        // Pick category with most photos for better gallery
        const [bestCategory, categoryMemories] = populatedCategories.reduce((a, b) => 
          a[1].length > b[1].length ? a : b
        );
        const shuffled = shuffleArray(categoryMemories);
        selectedPhotos = shuffled.slice(0, Math.min(6, categoryMemories.length));
      } else {
        const shuffled = shuffleArray(memories);
        selectedPhotos = shuffled.slice(0, Math.min(6, memories.length));
      }
      
      // Use AI to generate meaningful gallery title
      const response = await fetch('/api/memories/gallery-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories: selectedPhotos })
      });
      
      const titleData = await response.json();
      const galleryTitle = titleData.title || "Beautiful Memories";
      onCreateMemory(selectedPhotos, galleryTitle);
      
      toast({
        title: "Smart gallery created!",
        description: `"${galleryTitle}" with ${selectedPhotos.length} photos using AI analysis`
      });
      
    } catch (error) {
      console.error('Error creating smart memory:', error);
      
      // Fallback to simple random selection
      const shuffled = shuffleArray(memories);
      const selectedPhotos = shuffled.slice(0, Math.min(6, memories.length));
      
      const fallbackTitles = ['Beautiful Memories', 'Special Moments', 'Happy Times', 'Life Highlights'];
      const galleryTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
      
      onCreateMemory(selectedPhotos, galleryTitle);
      
      toast({
        title: "Gallery created",
        description: `"${galleryTitle}" with ${selectedPhotos.length} photos`
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createCategoryMemory = (category: string) => {
    const categoryPhotos = memories.filter(m => m.category === category);
    if (categoryPhotos.length < 2) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const shuffledPhotos = shuffleArray(categoryPhotos);
      const selectedPhotos = shuffledPhotos.slice(0, Math.min(6, categoryPhotos.length));
      
      const categoryTitles = {
        family: "Family Moments",
        friends: "Time with Friends",
        pets: "Pet Adventures",
        other: "Special Times"
      };
      
      const title = categoryTitles[category as keyof typeof categoryTitles] || "Memory Collection";
      onCreateMemory(selectedPhotos, title);
      setIsGenerating(false);
    }, 1000);
  };

  const createRecentMemory = () => {
    const recentPhotos = memories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, Math.min(5, memories.length));
    
    if (recentPhotos.length < 2) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      onCreateMemory(recentPhotos, "Recent Highlights");
      setIsGenerating(false);
    }, 1000);
  };

  const getAvailableCategories = () => {
    const categoryCounts = memories.reduce((acc, memory) => {
      acc[memory.category] = (acc[memory.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts).filter(([_, count]) => count >= 2);
  };

  if (memories.length < 2) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Create Your First Memory Gallery</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload at least 2 photos to automatically create beautiful memory collections
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Auto Memory Creator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={createSmartMemory}
            disabled={isGenerating || memories.length < 3}
            className="h-auto p-4 flex flex-col items-center gap-2 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900 dark:hover:to-pink-900"
            variant="outline"
          >
            {isGenerating ? (
              <Brain className="w-5 h-5 animate-spin text-purple-500" />
            ) : (
              <Brain className="w-5 h-5 text-purple-500" />
            )}
            <div className="text-center">
              <div className="font-medium">AI Smart Gallery</div>
              <div className="text-xs text-muted-foreground">
                {isGenerating ? "Analyzing..." : "AI-powered selection"}
              </div>
            </div>
          </Button>

          <Button
            onClick={createRecentMemory}
            disabled={isGenerating || memories.length < 2}
            className="h-auto p-4 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Calendar className="w-5 h-5" />
            <div className="text-center">
              <div className="font-medium">Recent Highlights</div>
              <div className="text-xs text-muted-foreground">
                Latest {Math.min(5, memories.length)} photos
              </div>
            </div>
          </Button>
        </div>

        {getAvailableCategories().length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Category Collections</h4>
            <div className="flex flex-wrap gap-2">
              {getAvailableCategories().map(([category, count]) => (
                <Button
                  key={category}
                  onClick={() => createCategoryMemory(category)}
                  disabled={isGenerating}
                  size="sm"
                  variant="outline"
                  className="h-auto p-2"
                >
                  <div className="flex items-center gap-1">
                    {category === 'family' && <Users className="w-3 h-3" />}
                    {category === 'friends' && <Heart className="w-3 h-3" />}
                    {category === 'pets' && <span className="text-xs">🐾</span>}
                    {category === 'other' && <Sparkles className="w-3 h-3" />}
                    <span className="capitalize text-xs">{category}</span>
                    <Badge variant="secondary" className="ml-1 h-4 text-xs">
                      {count}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Creating your memory...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}