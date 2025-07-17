import MovieCard from "@/components/movie-card";
import GroupedMovieCard from "@/components/grouped-movie-card";
import MovieVersionsGroup from "@/components/movie-versions-group";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Movie } from "@shared/schema";

interface MovieGridProps {
  movies: Movie[];
  isLoading: boolean;
  onMovieSelect: (movie: Movie) => void;
  groupVersions?: boolean;
}

export default function MovieGrid({ movies, isLoading, onMovieSelect, groupVersions = false }: MovieGridProps) {
  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-[2/3] rounded-lg bg-gray-700" />
              <Skeleton className="h-4 w-3/4 bg-gray-700" />
              <Skeleton className="h-3 w-1/2 bg-gray-700" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (movies.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold text-white mb-2">No movies found</h2>
          <p className="text-gray-400 mb-6">
            Your collection is empty or no movies match your current filters.
          </p>
          <Button className="bg-app-accent hover:bg-orange-600">
            Add Your First Movie
          </Button>
        </div>
      </main>
    );
  }

  // Always group movies by title for the new format
  const groupedByTitle = movies.reduce((acc, movie) => {
    const key = `${movie.title}-${movie.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(movie);
    return acc;
  }, {} as Record<string, Movie[]>);

  const displayItems = Object.entries(groupedByTitle).map(([key, movieVersions]) => ({
    key,
    title: movieVersions[0].title,
    movies: movieVersions.sort((a, b) => (b.isPrimary || 0) - (a.isPrimary || 0)), // Primary versions first
    isGroup: movieVersions.length > 1
  }));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap gap-2 justify-start items-start">
        {displayItems.map((item) => (
          <div key={item.key} className="flex-shrink-0">
            <GroupedMovieCard
              movies={item.movies}
              onClick={onMovieSelect}
            />
          </div>
        ))}
      </div>

      {/* Load More Button - Future implementation */}
      {movies.length > 0 && (
        <div className="text-center mt-12">
          <Button
            variant="outline"
            className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
          >
            Load More Movies
          </Button>
        </div>
      )}
    </main>
  );
}
