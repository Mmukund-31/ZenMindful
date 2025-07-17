import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Smile, Download, Wand2, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "@/components/file-upload";

interface MemeGeneratorProps {
  memories: any[];
}

const memeStyles = [
  { id: "classic", name: "Classic Impact", description: "Bold white text with black outline" },
  { id: "modern", name: "Modern Clean", description: "Sleek white text with subtle shadow" },
  { id: "funny", name: "Extra Funny", description: "Maximum humor potential" },
  { id: "wholesome", name: "Wholesome", description: "Positive and uplifting vibes" },
];

export default function MemeGenerator({ memories }: MemeGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedMemory, setSelectedMemory] = useState<any>(null);
  const [memeStyle, setMemeStyle] = useState("funny");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeme, setGeneratedMeme] = useState<string | null>(null);
  const [aiMemeText, setAiMemeText] = useState<{ topText: string; bottomText: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // AI-powered meme analysis and text generation
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('style', memeStyle);
      
      const response = await fetch('/api/meme/analyze-and-generate', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAiMemeText({
        topText: data.topText,
        bottomText: data.bottomText
      });
      generateMemeCanvas(data.topText, data.bottomText);
      toast({
        title: "AI Meme Created!",
        description: "Your funny meme is ready to download.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not create meme from this image. Please try another image.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setGeneratedMeme(null);
    setAiMemeText(null);
  };

  const handleMemorySelect = (memory: any) => {
    setSelectedMemory(memory);
    setImagePreview(memory.imageUrl);
    setGeneratedMeme(null);
    setAiMemeText(null);
  };

  const generateAIMeme = async () => {
    if (!selectedImage && !selectedMemory) {
      toast({
        title: "No Image Selected",
        description: "Please upload an image or select a memory first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedImage) {
      analyzeImageMutation.mutate(selectedImage);
    } else if (selectedMemory) {
      // Convert memory image URL to blob and analyze
      try {
        const response = await fetch(selectedMemory.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'memory.jpg', { type: 'image/jpeg' });
        analyzeImageMutation.mutate(file);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not process the selected memory image.",
          variant: "destructive",
        });
      }
    }
  };

  const generateMemeCanvas = (topText: string, bottomText: string) => {
    const canvas = canvasRef.current;
    if (!canvas || !imagePreview) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = Math.min(img.width, 800);
      canvas.height = Math.min(img.height, 600);
      
      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Apply meme style
      applyMemeStyle(ctx, canvas, topText, bottomText);
      
      // Convert to data URL
      setGeneratedMeme(canvas.toDataURL('image/jpeg', 0.9));
      setIsGenerating(false);
    };
    img.src = imagePreview;
  };

  const applyMemeStyle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, topText: string, bottomText: string) => {
    const fontSize = Math.max(24, Math.min(48, canvas.width / 15));
    
    // Style configurations
    const styleConfig = {
      classic: { font: 'Impact', fillColor: '#FFFFFF', strokeColor: '#000000', strokeWidth: 3 },
      modern: { font: 'Arial', fillColor: '#FFFFFF', strokeColor: '#333333', strokeWidth: 2 },
      funny: { font: 'Comic Sans MS', fillColor: '#FFFF00', strokeColor: '#FF0000', strokeWidth: 2 },
      wholesome: { font: 'Georgia', fillColor: '#FFE4E1', strokeColor: '#8B4513', strokeWidth: 2 },
    };

    const style = styleConfig[memeStyle as keyof typeof styleConfig] || styleConfig.classic;
    
    ctx.font = `bold ${fontSize}px ${style.font}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = style.fillColor;
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;

    // Draw top text
    if (topText) {
      const lines = wrapText(ctx, topText.toUpperCase(), canvas.width - 40);
      const lineHeight = fontSize * 1.2;
      const startY = 50;
      
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        ctx.strokeText(line, canvas.width / 2, y);
        ctx.fillText(line, canvas.width / 2, y);
      });
    }

    // Draw bottom text
    if (bottomText) {
      const lines = wrapText(ctx, bottomText.toUpperCase(), canvas.width - 40);
      const lineHeight = fontSize * 1.2;
      const startY = canvas.height - (lines.length * lineHeight) - 20;
      
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        ctx.strokeText(line, canvas.width / 2, y);
        ctx.fillText(line, canvas.width / 2, y);
      });
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const downloadMeme = () => {
    if (!generatedMeme) return;
    
    const link = document.createElement('a');
    link.download = `mindease-meme-${Date.now()}.jpg`;
    link.href = generatedMeme;
    link.click();
    
    toast({
      title: "Meme Downloaded!",
      description: "Your funny meme has been saved to your device.",
    });
  };

  const regenerateMeme = () => {
    if (selectedImage || selectedMemory) {
      generateAIMeme();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <Smile className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <CardTitle>AI Meme Generator</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Upload any image and let AI create hilarious memes automatically
            </p>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            AI-Powered Meme Generator
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <Label className="text-base font-semibold">Upload Your Image</Label>
              <div className="mt-2">
                <FileUpload
                  onFileSelect={handleImageSelect}
                  accept="image/*"
                  maxSize={10 * 1024 * 1024} // 10MB
                  className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors"
                />
              </div>
            </div>

            {/* Memory Selection */}
            {memories.length > 0 && (
              <div>
                <Label className="text-base font-semibold">Or Choose from Your Memories</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {memories.slice(0, 6).map((memory) => (
                    <div
                      key={memory.id}
                      onClick={() => handleMemorySelect(memory)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedMemory?.id === memory.id
                          ? 'border-purple-500 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <img
                        src={memory.imageUrl}
                        alt={memory.title}
                        className="w-full h-16 object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meme Style */}
            <div>
              <Label htmlFor="meme-style">Meme Style</Label>
              <Select value={memeStyle} onValueChange={setMemeStyle}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose meme style" />
                </SelectTrigger>
                <SelectContent>
                  {memeStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      <div>
                        <div className="font-medium">{style.name}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Generated Text Display */}
            {aiMemeText && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  AI Generated Text:
                </h4>
                <div className="text-sm space-y-1">
                  <p><strong>Top:</strong> {aiMemeText.topText}</p>
                  <p><strong>Bottom:</strong> {aiMemeText.bottomText}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={generateAIMeme}
                disabled={(!selectedImage && !selectedMemory) || analyzeImageMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {analyzeImageMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Meme...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate AI Meme
                  </>
                )}
              </Button>
              
              {aiMemeText && (
                <Button onClick={regenerateMeme} variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="space-y-4">
            {imagePreview && (
              <div>
                <Label className="text-base font-semibold">Preview</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain bg-gray-100"
                  />
                </div>
              </div>
            )}

            {generatedMeme && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Generated Meme</Label>
                  <Button onClick={downloadMeme} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={generatedMeme}
                    alt="Generated Meme"
                    className="w-full object-contain bg-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Hidden Canvas */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}