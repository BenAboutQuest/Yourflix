import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import GroupedMovieCard from "@/components/grouped-movie-card";
import { getSubGenresForGenre } from "@shared/genres";
import type { Movie } from "@shared/schema";

interface GenreRowProps {
  genre: string;
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  onSubGenreNavigate: (genre: string, subGenres: string[]) => void;
}

export default function GenreRow({ genre, movies, onMovieSelect, onSubGenreNavigate }: GenreRowProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (movies.length === 0) return null;

  // Group movies by title for consolidated display
  const groupedByTitle = movies.reduce((acc, movie) => {
    const key = `${movie.title}-${movie.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(movie);
    return acc;
  }, {} as Record<string, Movie[]>);

  const displayGroups = Object.entries(groupedByTitle).map(([key, movieVersions]) => ({
    key,
    movies: movieVersions.sort((a, b) => (b.isPrimary || 0) - (a.isPrimary || 0)), // Primary versions first
  }));

  const subGenres = getSubGenresForGenre(genre);
  const hasSubGenres = subGenres.length > 0;

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`genre-row-${genre}`);
    if (!container) return;

    const cardWidth = 140; // Approximate card width + margin (adjusted for smaller images)
    const scrollAmount = cardWidth * 5; // Scroll 5 cards at a time

    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });

    setScrollPosition(newPosition);
    setShowLeftArrow(newPosition > 0);
    setShowRightArrow(newPosition + container.clientWidth < container.scrollWidth);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{genre}</h2>
          {hasSubGenres && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSubGenreNavigate(genre, subGenres)}
              className="text-gray-400 hover:text-white hover:bg-gray-800 px-2 py-1 h-auto text-xs"
              title={`Browse ${genre} sub-genres`}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              {subGenres.length} sub-genres
            </Button>
          )}
        </div>
        <span className="text-sm text-gray-400">{displayGroups.length} titles ({movies.length} versions)</span>
      </div>
      
      <div className="relative group">
        {/* Left Arrow */}
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleScroll('left')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        {/* Scrollable Movie Row */}
        <div
          id={`genre-row-${genre}`}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-2"
          style={{ alignItems: 'flex-start' }} // Align all cards to top for consistent height baseline
          onScroll={(e) => {
            const target = e.currentTarget;
            setScrollPosition(target.scrollLeft);
            setShowLeftArrow(target.scrollLeft > 0);
            setShowRightArrow(target.scrollLeft + target.clientWidth < target.scrollWidth);
          }}
        >
          {displayGroups.map((group) => (
            <div key={group.key} className="flex-shrink-0">
              <GroupedMovieCard movies={group.movies} onClick={onMovieSelect} />
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => handleScroll('right')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}