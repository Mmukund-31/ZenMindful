import { useState, useEffect } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Heart, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MemoryGalleryProps {
  photos: Array<{
    id: number;
    title: string;
    imageUrl: string;
    category: string;
  }>;
  title: string;
  onClose?: () => void;
}

export default function MemoryGallery({ photos, title, onClose }: MemoryGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, photos.length]);

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  if (photos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No photos available for this memory</p>
      </Card>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm opacity-80">
                {currentIndex + 1} of {photos.length} photos
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayback}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                ×
              </Button>
            </div>
          </div>
        </div>

        {/* Main Image */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={currentPhoto.imageUrl}
            alt={currentPhoto.title}
            className="max-w-full max-h-full object-contain"
          />
          
          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={prevPhoto}
                className="absolute left-4 text-white hover:bg-white/20 p-2"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextPhoto}
                className="absolute right-4 text-white hover:bg-white/20 p-2"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="text-white">
            <h3 className="font-semibold">{currentPhoto.title}</h3>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {currentPhoto.category}
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Heart className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Thumbnails */}
        {photos.length > 1 && (
          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div className="flex gap-2 justify-center overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 ${
                    index === currentIndex
                      ? "border-white"
                      : "border-transparent opacity-60"
                  }`}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}