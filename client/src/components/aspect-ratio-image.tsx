interface MoviePosterImageProps {
  movie: {
    id: number;
    title: string;
    posterUrl?: string | null;
    availableImages?: string[] | null;
    format: string;
  };
  height?: number;
  className?: string;
  showFormat?: boolean;
}

export function MoviePosterImage({ 
  movie, 
  height = 200, 
  className = "",
  showFormat = false 
}: MoviePosterImageProps) {
  const posterSrc = movie.posterUrl || movie.availableImages?.[0];
  const width = Math.round(height * 0.67); // Standard movie poster aspect ratio

  return (
    <div 
      className={`relative flex-shrink-0 overflow-hidden rounded-lg shadow-lg ${className}`}
      style={{ 
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      {posterSrc ? (
        <img
          src={posterSrc}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-gray-400 dark:text-gray-500 text-sm font-medium">
              {movie.title}
            </div>
            <div className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              No Image
            </div>
          </div>
        </div>
      )}
      
      {showFormat && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {movie.format}
        </div>
      )}
    </div>
  );
}

// Legacy export alias for backward compatibility
export const AspectRatioImage = MoviePosterImage;