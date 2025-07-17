import { Edit, MapPin, Star, UserX, Clock, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@shared/schema";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  onClick: () => void;
}

const FORMAT_COLORS = {
  'VHS': 'bg-purple-600',
  'Betamax': 'bg-purple-700',
  'LaserDisc': 'bg-app-accent',
  'CED': 'bg-orange-700',
  'VCD': 'bg-yellow-600',
  'S-VHS': 'bg-purple-500',
  'MiniDV': 'bg-indigo-600',
  'DVD': 'bg-green-600',
  'HD DVD': 'bg-red-600',
  'Blu-ray': 'bg-blue-600',
  '4K Ultra HD Blu-ray': 'bg-blue-800',
};

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  const formatColor = FORMAT_COLORS[movie.format as keyof typeof FORMAT_COLORS] || 'bg-gray-600';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement edit functionality
    console.log('Edit movie:', movie.id);
  };

  const handleLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement location functionality
    console.log('Show location:', movie.location);
  };

  return (
    <div
      className="group cursor-pointer movie-card-hover"
      onClick={onClick}
    >
      <div className="relative">
        {/* Movie Poster */}
        <div className="w-full aspect-[2/3] bg-gray-800 rounded-lg shadow-lg overflow-hidden relative">
          {movie.posterUrl && !imageError ? (
            <>
              <img
                src={movie.posterUrl}
                alt={`${movie.title} poster`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => {
                  setImageError(true);
                }}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-gray-400">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm font-medium text-gray-300 mb-1">{movie.title}</p>
                <p className="text-xs text-gray-500">{movie.year}</p>
                {movie.posterUrl && imageError && (
                  <p className="text-xs text-red-400 mt-2">Poster unavailable</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Format Badge */}
        <div className="absolute top-1 left-1">
          <Badge className={`${formatColor} text-white text-xs px-1 py-0.5 font-medium`}>
            {movie.format}
          </Badge>
        </div>

        {/* Loan Status Badge */}
        {movie.loanedTo && (
          <div className="absolute top-1 right-1">
            <Badge className="bg-red-600 text-white text-xs px-1 py-0.5 font-medium">
              Loaned
            </Badge>
          </div>
        )}

        {/* Condition Stars */}
        {movie.condition && (
          <div className="absolute bottom-2 left-2 flex items-center space-x-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < movie.condition! ? 'text-yellow-400 fill-current' : 'text-gray-500'
                }`}
              />
            ))}
          </div>
        )}


      </div>

      {/* Movie Info */}
      <div className="mt-2">
        <h3 className="text-xs font-medium text-white group-hover:text-app-accent transition-colors truncate">
          {movie.title}
        </h3>
        
        {/* Watch Status */}
        <div className="mt-1">
          {movie.lastWatchedDate ? (
            <p className="text-xs text-orange-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(movie.lastWatchedDate).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-xs text-blue-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Not watched
            </p>
          )}
        </div>
        
        {movie.year && (
          <p className="text-xs text-gray-400 mt-1">{movie.year}</p>
        )}
      </div>
    </div>
  );
}
