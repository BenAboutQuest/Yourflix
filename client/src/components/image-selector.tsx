import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Upload, Globe, Database } from "lucide-react";

interface ImageOption {
  url: string;
  source: 'upload' | 'tmdb' | 'lddb' | 'external';
  label: string;
  description?: string;
}

interface ImageSelectorProps {
  availableImages: ImageOption[];
  selectedImageUrl?: string;
  onImageSelect: (url: string) => void;
  onUploadNew?: () => void;
  previewHeight?: number;
  allowUpload?: boolean;
}

export function ImageSelector({
  availableImages,
  selectedImageUrl,
  onImageSelect,
  onUploadNew,
  previewHeight = 200,
  allowUpload = true
}: ImageSelectorProps) {
  const [selectedImage, setSelectedImage] = useState(selectedImageUrl);

  const handleImageSelect = (url: string) => {
    setSelectedImage(url);
    onImageSelect(url);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'upload':
        return <Upload size={16} />;
      case 'tmdb':
        return <Database size={16} />;
      case 'lddb':
      case 'external':
        return <Globe size={16} />;
      default:
        return null;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'upload':
        return 'bg-green-600';
      case 'tmdb':
        return 'bg-blue-600';
      case 'lddb':
      case 'external':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">Available Images</h4>
        {allowUpload && onUploadNew && (
          <Button
            size="sm"
            onClick={onUploadNew}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Upload size={14} className="mr-1" />
            Upload New
          </Button>
        )}
      </div>

      {availableImages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">📷</div>
          <p className="text-sm">No images available</p>
          {allowUpload && onUploadNew && (
            <Button
              size="sm"
              onClick={onUploadNew}
              className="mt-2 bg-orange-600 hover:bg-orange-700"
            >
              Upload First Image
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableImages.map((image, index) => (
            <div
              key={index}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === image.url
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onClick={() => handleImageSelect(image.url)}
            >
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={image.url}
                  alt={image.label}
                  className="w-full h-full object-cover"
                  style={{ height: `${previewHeight}px` }}
                />
                
                {/* Selection Indicator */}
                {selectedImage === image.url && (
                  <div className="absolute top-2 right-2 bg-orange-600 text-white rounded-full p-1">
                    <Check size={12} />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {selectedImage === image.url ? (
                      <Badge className="bg-orange-600 text-white">Selected</Badge>
                    ) : (
                      <Badge className="bg-white text-black">Select</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Info */}
              <div className="p-2 bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {getSourceIcon(image.source)}
                    <span className="text-xs text-gray-300">{image.label}</span>
                  </div>
                  <Badge 
                    className={`text-xs text-white ${getSourceColor(image.source)}`}
                  >
                    {image.source.toUpperCase()}
                  </Badge>
                </div>
                {image.description && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {image.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-300 mb-2">Selected Image Preview:</p>
          <div className="flex items-start gap-4">
            <img
              src={selectedImage}
              alt="Selected poster"
              className="rounded border border-orange-500 object-cover"
              style={{ height: '120px', width: '80px' }}
            />
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                This image will be used as the primary poster for the movie.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleImageSelect('')}
                className="mt-2 border-gray-500 text-gray-300"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}