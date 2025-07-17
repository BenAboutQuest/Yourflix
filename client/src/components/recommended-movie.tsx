import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shuffle, Star, Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@shared/schema";

interface RecommendedMovieProps {
  onMovieSelect: (movie: Movie) => void;
}

export default function RecommendedMovie({ onMovieSelect }: RecommendedMovieProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { data: movies = [], refetch, isLoading } = useQuery<Movie[]>({
    queryKey: ['/api/movies/recommended-three'],
  });

  // Minimum swipe distance (in px) to trigger swipe
  const minSwipeDistance = 50;

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="bg-app-gray-800 rounded-lg p-6 border border-app-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4">Recommended to Watch from Your Collection</h2>
          <div className="animate-pulse flex">
            <div className="w-32 h-48 bg-gray-700 rounded"></div>
            <div className="flex-1 ml-6 space-y-4">
              <div className="h-6 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="mb-8">
        <div className="bg-app-gray-800 rounded-lg p-6 border border-app-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4">Recommended to Watch from Your Collection</h2>
          <p className="text-gray-400">No recommendations available</p>
        </div>
      </div>
    );
  }

  const currentMovie = movies[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const handleShuffle = () => {
    refetch();
    setCurrentIndex(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < movies.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-900/20 via-app-gray-800/80 to-red-900/20 backdrop-blur-sm">
        {/* Background Cover Art */}
        {currentMovie?.posterUrl && (
          <div 
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: `url(${currentMovie.posterUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-red-500/10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-app-gray-900/30 to-app-gray-900/60"></div>
        <div 
          className="relative z-10 flex transition-transform duration-300 ease-in-out"
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="w-full flex-shrink-0 relative">
              {/* Navigation arrows */}
              {movies.length > 1 && index === currentIndex && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-orange-500/20 hover:bg-orange-500/40 text-white rounded-full w-8 h-8 z-30 border border-orange-500/30"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500/20 hover:bg-orange-500/40 text-white rounded-full w-8 h-8 z-30 border border-orange-500/30"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}

              <div className="relative z-20 p-6">
                {/* Header with title and New Picks button */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Recommended</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShuffle}
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 bg-black/20 backdrop-blur-sm"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    New Picks
                  </Button>
                </div>

                {/* Movie content */}
                <div className="flex gap-4">
                  {/* Movie Poster - Clickable */}
                  <div 
                    className="w-32 h-48 flex-shrink-0 relative cursor-pointer hover:scale-105 transition-transform border border-orange-500/30 rounded-lg overflow-hidden"
                    onClick={() => onMovieSelect(movie)}
                  >
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={`${movie.title} poster`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-500 text-4xl">🎬</span>
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-2xl font-bold text-white mb-1 cursor-pointer hover:text-orange-400 transition-colors"
                      onClick={() => onMovieSelect(movie)}
                    >
                      {movie.title}
                    </h3>
                    
                    {/* Watch Status */}
                    <div className="mb-2">
                      {movie.lastWatchedDate ? (
                        <span className="flex items-center gap-1 text-orange-400 text-sm">
                          <Clock className="w-4 h-4" />
                          Last watched {new Date(movie.lastWatchedDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-400 text-sm">
                          <Clock className="w-4 h-4" />
                          Not yet watched
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {movie.year}
                      </span>
                      {movie.runtime && <span>{movie.runtime} min</span>}
                      {movie.personalRating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          {movie.personalRating}/5
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className="bg-orange-600/80 text-white border border-orange-500/50">{movie.format}</Badge>
                      {movie.genres?.slice(0, 3).map((genre) => (
                        <Badge key={genre} variant="secondary" className="bg-gray-600/80 text-gray-200 border border-gray-500/50">
                          {genre}
                        </Badge>
                      ))}
                    </div>

                    {movie.description && (
                      <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                        {movie.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Slide indicators below the card */}
        {movies.length > 1 && (
          <div className="relative z-20 flex justify-center gap-2 py-3 bg-black/20 backdrop-blur-sm border-t border-orange-500/30">
            {movies.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-orange-400 scale-110 shadow-lg shadow-orange-400/50' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}