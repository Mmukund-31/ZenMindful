import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Heart, Filter, Upload, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FileUpload from "@/components/file-upload";
import MemoryVideoCreator from "@/components/memory-video-creator";
import MemeGenerator from "@/components/meme-generator";
import MemoryGallery from "@/components/memory-gallery";
import AutoMemoryCreator from "@/components/auto-memory-creator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { id: "all", label: "All" },
  { id: "family", label: "Family" },
  { id: "friends", label: "Friends" },
  { id: "pets", label: "Pets" },
  { id: "other", label: "Other" },
];

export default function Memories() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<{photos: any[], title: string} | null>(null);
  const [autoCreatedMemories, setAutoCreatedMemories] = useState<Array<{id: string, photos: any[], title: string, createdAt: string}>>([]);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    category: "family",
    file: null as File | null,
  });
  const { toast } = useToast();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["/api/memories", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory === "all" ? "/api/memories" : `/api/memories?category=${selectedCategory}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch memories");
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadData.file) throw new Error("No file selected");

      const formData = new FormData();
      formData.append("image", uploadData.file);
      formData.append("title", uploadData.title || "Untitled Memory");
      formData.append("description", uploadData.description || "");
      formData.append("category", uploadData.category);

      const response = await fetch("/api/memories", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload memory");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
      setIsUploadOpen(false);
      setUploadData({ title: "", description: "", category: "family", file: null });
      toast({
        title: "Memory uploaded!",
        description: "Your memory has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload memory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      return apiRequest("PATCH", `/api/memories/${id}/favorite`, { isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memories"] });
    },
  });

  const handleUpload = () => {
    uploadMutation.mutate();
  };

  const toggleFavorite = (memory: any) => {
    favoriteMutation.mutate({ id: memory.id, isFavorite: !memory.isFavorite });
  };

  const handleCreateAutoMemory = (photos: any[], title: string) => {
    const newMemory = {
      id: Date.now().toString(),
      photos,
      title,
      createdAt: new Date().toISOString()
    };
    setAutoCreatedMemories(prev => [newMemory, ...prev]);
    setSelectedGallery({ photos, title });
    toast({
      title: "Memory Created!",
      description: `"${title}" gallery is ready to view`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Memories</h2>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="w-10 h-10 rounded-full p-0">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Memory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <FileUpload
                onFileSelect={(file) => setUploadData(prev => ({ ...prev, file }))}
              />
              
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Memory title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={uploadData.category} 
                  onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!uploadData.file || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? "Uploading..." : "Save Memory"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upload Section */}
      <Card className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30 border-dashed border-2 mb-6">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-accent" />
          </div>
          <h3 className="font-medium text-foreground mb-2">Add New Memory</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload photos of your loved ones to create lasting memories
          </p>
          <Button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-accent hover:bg-accent/90"
          >
            Choose Photos
          </Button>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex space-x-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((category) => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "secondary"}
            className="cursor-pointer hover:bg-primary/80 transition-colors flex-shrink-0"
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.label}
          </Badge>
        ))}
      </div>

      {/* Auto Memory Creator */}
      {memories.length > 0 && (
        <div className="mb-6">
          <AutoMemoryCreator 
            memories={memories} 
            onCreateMemory={handleCreateAutoMemory}
          />
        </div>
      )}

      {/* Auto-Created Memory Galleries */}
      {autoCreatedMemories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Memory Collections
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {autoCreatedMemories.map((autoMemory) => (
              <Card 
                key={autoMemory.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedGallery({ photos: autoMemory.photos, title: autoMemory.title })}
              >
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {autoMemory.photos.slice(0, 4).map((photo, index) => (
                      <img
                        key={index}
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{autoMemory.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {autoMemory.photos.length} photos
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Individual Photos Grid */}
      {memories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">No memories yet</h3>
            <p className="text-sm text-muted-foreground">
              Start adding photos to create your memory collection
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {memories.map((memory: any) => (
            <div 
              key={memory.id} 
              className="relative group cursor-pointer"
              onClick={() => setSelectedGallery({ photos: [memory], title: memory.title })}
            >
              <img
                src={memory.imageUrl}
                alt={memory.title}
                className="w-full h-32 object-cover rounded-xl shadow-sm"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition-all"></div>
              <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-all">
                <p className="text-xs font-medium text-foreground truncate">{memory.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(memory.timestamp).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(memory);
                }}
                className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
              >
                <Heart
                  className={`w-3 h-3 ${
                    memory.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  }`}
                />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Creative Tools */}
      {memories.length > 0 && (
        <div className="mt-8 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Creative Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MemoryVideoCreator memories={memories} />
              <MemeGenerator memories={memories} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Memory Gallery Viewer */}
      {selectedGallery && (
        <MemoryGallery
          photos={selectedGallery.photos}
          title={selectedGallery.title}
          onClose={() => setSelectedGallery(null)}
        />
      )}
    </div>
  );
}
