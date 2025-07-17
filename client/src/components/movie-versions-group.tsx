import { useState } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@shared/schema";

interface MovieVersionsGroupProps {
  title: string;
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
}

export default function MovieVersionsGroup({ title, movies, onMovieSelect }: MovieVersionsGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Sort movies by isPrimary first, then by format
  const sortedMovies = [...movies].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.format || '').localeCompare(b.format || '');
  });
  
  const primaryMovie = sortedMovies.find(m => m.isPrimary) || sortedMovies[0];
  const versionCount = movies.length;

  const handleMainCardClick = () => {
    if (versionCount === 1) {
      onMovieSelect(primaryMovie);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const formatCondition = (condition: number | null) => {
    if (!condition) return '';
    return '★'.repeat(condition) + '☆'.repeat(5 - condition);
  };

  return (
    <div className="bg-app-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Main Movie Card */}
      <div 
        className="relative cursor-pointer group hover:bg-app-gray-750 transition-colors"
        onClick={handleMainCardClick}
      >
        <div className="aspect-[2/3] relative">
          {primaryMovie.posterUrl ? (
            <img
              src={primaryMovie.posterUrl}
              alt={primaryMovie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-app-gray-700 flex items-center justify-center">
              <div className="text-center text-gray-400 p-4">
                <div className="font-medium">{primaryMovie.title}</div>
                <div className="text-sm">{primaryMovie.year}</div>
              </div>
            </div>
          )}
          
          {/* Version count indicator */}
          {versionCount > 1 && (
            <div className="absolute top-2 right-2 bg-app-accent text-white text-xs px-2 py-1 rounded-full font-medium">
              {versionCount} versions
            </div>
          )}
          
          {/* Expand/Collapse indicator */}
          {versionCount > 1 && (
            <div className="absolute top-2 left-2 bg-black/60 text-white p-1 rounded">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          )}
        </div>
        
        {/* Movie info */}
        <div className="p-3">
          <h3 className="font-medium text-white text-sm leading-tight mb-1">
            {primaryMovie.title}
          </h3>
          <div className="text-xs text-gray-400 mb-2">
            {primaryMovie.year} • {primaryMovie.format}
            {primaryMovie.edition && ` • ${primaryMovie.edition}`}
          </div>
          
          {primaryMovie.condition && (
            <div className="text-xs text-yellow-400 mb-1">
              {formatCondition(primaryMovie.condition)}
            </div>
          )}
          
          {primaryMovie.catalogId && (
            <div className="text-xs text-app-accent">
              #{primaryMovie.catalogId}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Versions List */}
      {isExpanded && versionCount > 1 && (
        <div className="border-t border-app-gray-600">
          <div className="p-3 bg-app-gray-750">
            <h4 className="text-sm font-medium text-gray-300 mb-3">
              All Versions ({versionCount})
            </h4>
            <div className="space-y-2">
              {sortedMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMovieSelect(movie);
                  }}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-app-gray-700 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-12 bg-app-gray-600 rounded flex-shrink-0">
                    {movie.posterUrl && (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover rounded"
                      />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                        {movie.format}
                      </Badge>
                      {movie.edition && (
                        <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                          {movie.edition}
                        </Badge>
                      )}
                      {movie.isPrimary === 1 && (
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {movie.catalogId && `Catalog: ${movie.catalogId}`}
                      {movie.condition && (
                        <span className="ml-2 text-yellow-400">
                          {formatCondition(movie.condition)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}