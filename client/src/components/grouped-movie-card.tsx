import { Star, UserX, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MoviePosterImage } from "./aspect-ratio-image";
import type { Movie } from "@shared/schema";

interface GroupedMovieCardProps {
  movies: Movie[];
  onClick: (primaryMovie: Movie) => void;
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

export default function GroupedMovieCard({ movies, onClick }: GroupedMovieCardProps) {
  
  // Find primary movie or use first one
  const primaryMovie = movies.find(m => m.isPrimary === 1) || movies[0];
  
  // Group by format and count versions
  const formatCounts = movies.reduce((acc, movie) => {
    acc[movie.format] = (acc[movie.format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatBadges = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count,
    color: FORMAT_COLORS[format as keyof typeof FORMAT_COLORS] || 'bg-gray-600'
  }));

  return (
    <div
      className="group cursor-pointer movie-card-hover flex-shrink-0"
      onClick={() => onClick(primaryMovie)}
      style={{ width: `${200 * 0.67}px` }}
    >
      <div className="relative">
        {/* Movie Poster with Preserved Aspect Ratio */}
        <div className="relative flex justify-center">
          <MoviePosterImage
            movie={primaryMovie}
            height={200}
            className="rounded-lg shadow-lg"
            showFormat={false}
          />

          {/* Format badges overlay */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 max-w-[calc(100%-1rem)]">
            {formatBadges.map(({ format, count, color }, index) => (
              <Badge 
                key={format} 
                className={`${color} text-white text-xs px-2 py-1 shadow-lg backdrop-blur-sm bg-opacity-90`}
              >
                {format}{count > 1 ? ` x${count}` : ''}
              </Badge>
            ))}
          </div>

          {/* Primary version indicator */}
          {primaryMovie.isPrimary === 1 && movies.length > 1 && (
            <div className="absolute top-2 right-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current drop-shadow-lg" />
            </div>
          )}

          {/* Loan status overlay */}
          {movies.some(m => m.loanedTo) && (
            <div className="absolute bottom-2 left-2">
              <Badge className="bg-red-600 text-white text-xs px-2 py-1 shadow-lg">
                <UserX className="w-3 h-3 mr-1" />
                Loaned
              </Badge>
            </div>
          )}

          {/* Multiple versions indicator */}
          {movies.length > 1 && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-blue-600 text-white text-xs px-2 py-1 shadow-lg">
                {movies.length} versions
              </Badge>
            </div>
          )}
        </div>

        {/* Movie Info */}
        <div className="mt-3 space-y-1">
          <h3 className="text-white font-medium text-sm leading-tight line-clamp-2">
            {primaryMovie.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{primaryMovie.year}</span>
            {primaryMovie.condition && (
              <div className="flex items-center">
                <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                <span>{primaryMovie.condition}/5</span>
              </div>
            )}
          </div>
          
          {/* Last watched info */}
          {movies.some(m => m.lastWatchedDate) && (
            <div className="flex items-center text-xs text-green-400">
              <Clock className="w-3 h-3 mr-1" />
              <span>Recently watched</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}