import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB
  className = ""
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onFileSelect(file);
  };

  const clearFile = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!preview ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 hover:from-accent/20 hover:to-primary/20"
        >
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-8 h-8 text-accent" />
            <span className="text-sm font-medium">Choose Photo</span>
            <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
          </div>
        </Button>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={clearFile}
            className="absolute top-2 right-2 w-6 h-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
