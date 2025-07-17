import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, Download, Sparkles, Shuffle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface MemoryVideoCreatorProps {
  memories: any[];
}

export default function MemoryVideoCreator({ memories }: MemoryVideoCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<number[]>([]);
  const [videoStyle, setVideoStyle] = useState("slideshow");
  const [isCreating, setIsCreating] = useState(false);
  const [createdVideoUrl, setCreatedVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const videoStyles = [
    { id: "slideshow", name: "Classic Slideshow", description: "Gentle transitions between photos" },
    { id: "collage", name: "Photo Collage", description: "Multiple photos in creative layouts" },
    { id: "heartbeat", name: "Heartbeat Effect", description: "Pulsing animation with love theme" },
    { id: "memories", name: "Memory Lane", description: "Vintage film style transitions" },
  ];

  const handleSelectAll = () => {
    if (selectedMemories.length === memories.length) {
      setSelectedMemories([]);
    } else {
      setSelectedMemories(memories.map(m => m.id));
    }
  };

  const handleSelectMemory = (memoryId: number) => {
    setSelectedMemories(prev => 
      prev.includes(memoryId) 
        ? prev.filter(id => id !== memoryId)
        : [...prev, memoryId]
    );
  };

  const createVideo = async () => {
    if (selectedMemories.length === 0) {
      toast({
        title: "No memories selected",
        description: "Please select at least one memory to create a video.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Simulate video creation process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, this would call an API to generate the video
      const videoBlob = await generateVideoFromImages(
        selectedMemories.map(id => memories.find(m => m.id === id)),
        videoStyle
      );
      
      const videoUrl = URL.createObjectURL(videoBlob);
      setCreatedVideoUrl(videoUrl);
      
      toast({
        title: "Video created successfully!",
        description: `Your ${videoStyles.find(s => s.id === videoStyle)?.name} is ready to download.`,
      });
    } catch (error) {
      toast({
        title: "Video creation failed",
        description: "There was an error creating your video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const downloadVideo = () => {
    if (createdVideoUrl) {
      const a = document.createElement('a');
      a.href = createdVideoUrl;
      a.download = `memory-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const generateVideoFromImages = async (selectedMemories: any[], style: string): Promise<Blob> => {
    // This is a simplified simulation - in a real app, you'd use a video generation library
    // or send the images to a server for processing
    return new Blob(['fake video data'], { type: 'video/mp4' });
  };

  if (memories.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Add some memories first to create a video
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-accent hover:bg-accent/90">
          <Play className="w-4 h-4 mr-2" />
          Create Memory Video
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Memory Video</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Video Style Selection */}
          <div className="space-y-2">
            <Label>Video Style</Label>
            <Select value={videoStyle} onValueChange={setVideoStyle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoStyles.map(style => (
                  <SelectItem key={style.id} value={style.id}>
                    <div className="text-left">
                      <div className="font-medium">{style.name}</div>
                      <div className="text-xs text-muted-foreground">{style.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Memory Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Memories ({selectedMemories.length} of {memories.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {selectedMemories.length === memories.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className={`relative cursor-pointer rounded-lg overflow-hidden ${
                    selectedMemories.includes(memory.id)
                      ? 'ring-2 ring-primary'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => handleSelectMemory(memory.id)}
                >
                  <img
                    src={memory.imageUrl}
                    alt={memory.title}
                    className="w-full h-16 object-cover"
                  />
                  {selectedMemories.includes(memory.id) && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {selectedMemories.indexOf(memory.id) + 1}
                        </span>
                      </div>
                    </div>
                  )}
                  {memory.isFavorite && (
                    <Heart className="absolute top-1 right-1 w-3 h-3 fill-red-500 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Preview/Result */}
          {createdVideoUrl && (
            <div className="space-y-3">
              <Label>Your Video is Ready!</Label>
              <div className="bg-muted rounded-lg p-4 text-center">
                <Play className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Video created with {selectedMemories.length} memories
                </p>
                <Button onClick={downloadVideo} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
              </div>
            </div>
          )}

          {/* Create Button */}
          {!createdVideoUrl && (
            <Button
              onClick={createVideo}
              disabled={isCreating || selectedMemories.length === 0}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating Video...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Video
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}