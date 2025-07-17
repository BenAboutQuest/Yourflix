import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/header";
import GenreRow from "@/components/genre-row";
import MovieDetailModal from "@/components/movie-detail-modal";
import FormatFilterBar from "@/components/format-filter-bar";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSubGenresForGenre } from "@shared/genres";
import type { Movie } from "@shared/schema";

interface SubGenresPageProps {
  genre: string;
}

export default function SubGenresPage({ genre }: SubGenresPageProps) {
  const [, navigate] = useLocation();
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch all movies
  const { data: allMovies = [] } = useQuery({
    queryKey: ['/api/movies'],
    queryFn: async () => {
      const response = await fetch('/api/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      return response.json();
    },
  });

  // Fetch collection statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  // Filter movies by the main genre and optional format
  const filteredMovies = useMemo(() => {
    return allMovies.filter((movie: Movie) => {
      const hasGenre = movie.genres?.includes(genre);
      const hasFormat = !selectedFormat || movie.format === selectedFormat;
      return hasGenre && hasFormat;
    });
  }, [allMovies, genre, selectedFormat]);

  // Get sub-genres for this genre
  const subGenres = getSubGenresForGenre(genre);

  // Group movies by sub-genre
  const moviesBySubGenre = useMemo(() => {
    const grouped: Record<string, Movie[]> = {};
    
    // Initialize with sub-genres
    subGenres.forEach(subGenre => {
      grouped[subGenre] = [];
    });
    
    // Group movies by their sub-genres (using genres array as proxy for sub-genres)
    filteredMovies.forEach(movie => {
      if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach(movieGenre => {
          if (subGenres.includes(movieGenre)) {
            if (!grouped[movieGenre]) {
              grouped[movieGenre] = [];
            }
            grouped[movieGenre].push(movie);
          }
        });
      }
    });
    
    // For demo purposes, distribute movies across sub-genres if they don't have specific sub-genre tags
    if (subGenres.length > 0 && Object.values(grouped).every(arr => arr.length === 0)) {
      filteredMovies.forEach((movie, index) => {
        const subGenreIndex = index % subGenres.length;
        grouped[subGenres[subGenreIndex]].push(movie);
      });
    }
    
    // Sort movies within each sub-genre by title
    Object.keys(grouped).forEach(subGenre => {
      grouped[subGenre].sort((a, b) => a.title.localeCompare(b.title));
    });
    
    return grouped;
  }, [filteredMovies, subGenres]);

  // Get sub-genres that have movies
  const subGenresWithMovies = useMemo(() => {
    return subGenres.filter(subGenre => moviesBySubGenre[subGenre]?.length > 0);
  }, [moviesBySubGenre, subGenres]);

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailModalOpen(true);
  };

  const handleBackToGenres = () => {
    navigate('/');
  };

  // Dummy handlers for GenreRow (sub-genres don't have further sub-genres)
  const handleSubGenreNavigate = () => {
    // Do nothing - sub-genres don't have further sub-genres
  };

  return (
    <div className="min-h-screen bg-app-primary">
      <Header 
        onAddMovie={() => {}}
        onScanBarcode={() => {}}
        onOpenSearch={() => {}}
      />
      
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToGenres}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">{genre} Sub-Genres</h1>
            <p className="text-gray-400 text-sm">
              {filteredMovies.length} movies • {subGenresWithMovies.length} sub-genres
            </p>
          </div>
        </div>
      </div>

      {/* Format Filter Bar */}
      <FormatFilterBar
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
        stats={stats}
      />

      {/* Sub-Genre Rows */}
      <div className="space-y-8 pb-8">
        {subGenresWithMovies.length > 0 ? (
          subGenresWithMovies.map(subGenre => (
            <GenreRow
              key={subGenre}
              genre={subGenre}
              movies={moviesBySubGenre[subGenre]}
              onMovieSelect={handleMovieSelect}
              onSubGenreNavigate={handleSubGenreNavigate}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No movies found in {genre} sub-genres</p>
            <p className="text-gray-500 text-sm mt-2">
              {selectedFormat ? `Try removing the ${selectedFormat} format filter` : 'Add some movies to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* Movie Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMovie(null);
        }}
        onMovieSelect={handleMovieSelect}
      />
    </div>
  );
}