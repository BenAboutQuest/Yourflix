import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import FilterBar from "@/components/filter-bar";
import GenreSidebar from "@/components/genre-sidebar";
import MovieGrid from "@/components/movie-grid";
import AddMovieModal from "@/components/add-movie-modal";
import MovieDetailModal from "@/components/movie-detail-modal";

import RecommendedMovie from "@/components/recommended-movie";
import SearchModal from "@/components/search-modal";
import CollectionOverview from "@/components/collection-overview";
import GenreBrowseView from "@/components/genre-browse-view";
import FormatFilterBar from "@/components/format-filter-bar";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Movie } from "@shared/schema";

interface CollectionStats {
  totalMovies: number;
  totalValue: number;
  formatCounts: Record<string, number>;
  genreCounts: Record<string, number>;
}

export default function Home() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'createdAt' | 'lastWatchedDate'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isGenreSidebarOpen, setIsGenreSidebarOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [viewMode, setViewMode] = useState<'genres' | 'grid'>('genres');

  // Fetch movies with filters
  const { data: movies = [], isLoading } = useQuery({
    queryKey: ['/api/movies', selectedFormat, selectedGenres.join(','), searchQuery, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFormat) params.append('format', selectedFormat);
      if (selectedGenres.length > 0) params.append('genres', selectedGenres.join(','));
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);
      
      const url = `/api/movies${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[FRONTEND DEBUG] Fetching movies with URL:', url);
      console.log('[FRONTEND DEBUG] Search query:', searchQuery);
      const result = await apiRequest(url);
      console.log('[FRONTEND DEBUG] Received movies:', result.length, 'total');
      return result;
    },
    staleTime: 0, // Always fetch fresh data when params change
  });

  // Fetch collection statistics
  const { data: stats } = useQuery<CollectionStats>({
    queryKey: ['/api/stats'],
    refetchOnMount: 'always',
  });

  // Fetch loaned movies count
  const { data: loanedMovies = [] } = useQuery({
    queryKey: ['/api/loans'],
  });

  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailModalOpen(true);
  };

  const handleSearchMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsDetailModalOpen(true);
  };

  const handleAddMovie = () => {
    setIsAddModalOpen(true);
  };



  const handleSubGenreNavigate = (genre: string, subGenres: string[]) => {
    // Navigate to the sub-genres page for this genre
    navigate(`/sub-genres/${encodeURIComponent(genre)}`);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background pattern overlay */}
      <div className="fixed inset-0 pattern-dots opacity-30 pointer-events-none"></div>
      <Header 
        onAddMovie={handleAddMovie}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />
      
      {/* Collection Overview */}
      <CollectionOverview 
        stats={stats}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        loanCount={loanedMovies.length}
        onNavigateToLoans={() => navigate('/loans')}
      />

      {/* Format Filter Bar */}
      <FormatFilterBar
        selectedFormat={selectedFormat}
        onFormatChange={setSelectedFormat}
        stats={stats}
      />

      <div className="relative flex overflow-hidden">
        <div className="flex-1 min-w-0">
          {viewMode === 'genres' ? (
            <GenreBrowseView 
              movies={movies}
              onMovieSelect={handleMovieSelect}
              onSubGenreNavigate={handleSubGenreNavigate}
            />
          ) : (
            <>
              <FilterBar
                selectedFormat={selectedFormat}
                onFormatChange={setSelectedFormat}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                onOpenGenreSidebar={() => setIsGenreSidebarOpen(true)}
                stats={stats}
              />

              <MovieGrid
                movies={movies}
                isLoading={isLoading}
                onMovieSelect={handleMovieSelect}
              />
            </>
          )}
        </div>

        {viewMode === 'grid' && (
          <GenreSidebar
            isOpen={isGenreSidebarOpen}
            onClose={() => setIsGenreSidebarOpen(false)}
            selectedGenres={selectedGenres}
            onGenresChange={setSelectedGenres}
            genreCounts={stats?.genreCounts}
          />
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={handleAddMovie}
          className="bg-app-accent hover:bg-orange-600 text-white w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-110"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Modals */}
      <AddMovieModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <MovieDetailModal
        movie={selectedMovie}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedMovie(null);
        }}
        onMovieSelect={handleMovieSelect}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onMovieSelect={handleSearchMovieSelect}
      />
    </div>
  );
}
