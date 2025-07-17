import { useMemo, useState, useEffect } from "react";
import GenreRow from "@/components/genre-row";
import RecommendedMovie from "@/components/recommended-movie";
import { MAIN_GENRES } from "@shared/genres";
import type { Movie } from "@shared/schema";

interface GenreSettings {
  id: string;
  name: string;
  enabled: boolean;
  isSubGenre: boolean;
  parentGenre?: string;
}

interface AppSettings {
  genres: GenreSettings[];
  showRecommendations: boolean;
}

interface GenreBrowseViewProps {
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
  onSubGenreNavigate: (genre: string, subGenres: string[]) => void;
}

export default function GenreBrowseView({ movies, onMovieSelect, onSubGenreNavigate }: GenreBrowseViewProps) {
  const [settings, setSettings] = useState<AppSettings>({
    genres: [],
    showRecommendations: true
  });

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('yourflixSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.genres && Array.isArray(parsed.genres)) {
          setSettings(parsed);
        } else {
          throw new Error('Invalid settings structure');
        }
      } catch (error) {
        console.log('Invalid settings in localStorage, using defaults');
        initializeDefaultSettings();
      }
    } else {
      initializeDefaultSettings();
    }
  }, []);

  const initializeDefaultSettings = () => {
    // Clear any corrupted settings first
    localStorage.removeItem('yourflixSettings');
    
    const defaultGenres = MAIN_GENRES.map(genre => ({
      id: `main_${genre.replace(/\s+/g, '_')}`,
      name: genre,
      enabled: true,
      isSubGenre: false,
    }));
    const newSettings = {
      genres: defaultGenres,
      showRecommendations: true
    };
    setSettings(newSettings);
    localStorage.setItem('yourflixSettings', JSON.stringify(newSettings));
  };

  // Group movies by genre based on user settings
  const moviesByGenre = useMemo(() => {
    const grouped: Record<string, Movie[]> = {};
    
    // Get enabled genres in the order they appear in settings
    const enabledGenres = settings.genres.filter(g => g.enabled);
    
    // Initialize with enabled genres
    enabledGenres.forEach(genreSetting => {
      grouped[genreSetting.name] = [];
    });
    
    // Group movies by their genres
    movies.forEach(movie => {
      if (movie.genres && movie.genres.length > 0) {
        movie.genres.forEach(genre => {
          // Check if this genre is enabled in settings
          const isEnabled = enabledGenres.some(g => g.name === genre);
          if (isEnabled) {
            if (!grouped[genre]) {
              grouped[genre] = [];
            }
            // Prevent duplicates by checking if movie is already in this genre
            const isDuplicate = grouped[genre].some(existingMovie => existingMovie.id === movie.id);
            if (!isDuplicate) {
              grouped[genre].push(movie);
            }
          }
        });
      }
    });
    
    // Sort movies within each genre by title
    Object.keys(grouped).forEach(genre => {
      grouped[genre].sort((a, b) => a.title.localeCompare(b.title));
    });
    
    return grouped;
  }, [movies, settings.genres]);

  // Get genres that have movies, in the order defined by settings
  const genresWithMovies = useMemo(() => {
    const enabledGenres = settings.genres.filter(g => g.enabled);
    return enabledGenres
      .map(g => g.name)
      .filter(genre => moviesByGenre[genre] && moviesByGenre[genre].length > 0);
  }, [moviesByGenre, settings.genres]);

  return (
    <div className="space-y-6">
      {/* Recommended Movie Section - only show if enabled in settings */}
      {settings.showRecommendations && (
        <div className="px-6">
          <RecommendedMovie onMovieSelect={onMovieSelect} />
        </div>
      )}

      {/* Genre Rows */}
      <div className="space-y-8">
        {genresWithMovies.map(genre => (
          <GenreRow
            key={genre}
            genre={genre}
            movies={moviesByGenre[genre]}
            onMovieSelect={onMovieSelect}
            onSubGenreNavigate={onSubGenreNavigate}
          />
        ))}
      </div>

      {/* Empty State */}
      {genresWithMovies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No movies in your collection yet</p>
          <p className="text-gray-500 text-sm mt-2">Add some movies to get started!</p>
        </div>
      )}
    </div>
  );
}