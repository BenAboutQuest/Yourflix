import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, MapPin, Trash2, X, Star, UserPlus, UserX, Eye, Clock, Play, Volume2, VolumeX, Copy, Upload, FileText, Save, Pen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RatingSelector from "./rating-selector";
import { EditMovieModal } from "./edit-movie-modal";
import type { Movie } from "@shared/schema";

interface MovieDetailModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onMovieSelect?: (movie: Movie) => void;
}

export default function MovieDetailModal({ movie, isOpen, onClose, onMovieSelect }: MovieDetailModalProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [loanPersonName, setLoanPersonName] = useState("");
  const [showLoanInput, setShowLoanInput] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [loanNotes, setLoanNotes] = useState("");
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset audio state when modal closes or movie changes
  useEffect(() => {
    if (!isOpen) {
      setAudioEnabled(false);
    }
  }, [isOpen, movie?.id]);

  // Initialize notes when movie changes
  useEffect(() => {
    if (movie) {
      setNotes(movie.notes || "");
      setShowNotesEdit(false);
    }
  }, [movie]);

  // Determine trailer URL - prioritize custom URL over automatic TMDb search
  const getTrailerUrl = useCallback(() => {
    if (movie?.youtubeTrailerUrl) {
      // Convert YouTube watch URL to embed URL if needed
      const url = movie.youtubeTrailerUrl;
      let embedUrl = '';
      
      if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('youtube.com/embed/')) {
        embedUrl = url;
      } else {
        embedUrl = url;
      }
      
      // Always ensure we have the base embed URL without parameters for consistent autoplay handling
      const baseUrl = embedUrl.split('?')[0];
      return baseUrl;
    }
    return null;
  }, [movie?.youtubeTrailerUrl]);

  // Fetch automatic trailer only if no custom URL is provided
  const { data: trailerData } = useQuery({
    queryKey: ['/api/movies', movie?.id, 'trailer'],
    queryFn: async () => {
      if (!movie?.id) return null;
      try {
        return await apiRequest(`/api/movies/${movie.id}/trailer`);
      } catch (error) {
        console.warn('Failed to fetch trailer:', error);
        return null;
      }
    },
    enabled: !!movie?.id && isOpen && !movie?.youtubeTrailerUrl,
  });

  // Fetch other versions of this movie
  const { data: allMovies = [] } = useQuery({
    queryKey: ['/api/movies'],
    enabled: isOpen && !!movie,
  });

  const otherVersions = movie ? allMovies.filter((m: Movie) => 
    m.title === movie.title && 
    m.year === movie.year && 
    m.id !== movie.id
  ) : [];

  const deleteMovieMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/movies/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Movie deleted",
        description: "The movie has been removed from your collection.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const loanMovieMutation = useMutation({
    mutationFn: async ({ id, loanedToName, expectedReturnDate, loanNotes }: { 
      id: number; 
      loanedToName: string; 
      expectedReturnDate: string;
      loanNotes?: string;
    }) => {
      return await apiRequest(`/api/movies/${id}/loan`, {
        method: 'PATCH',
        body: JSON.stringify({
          loanedToName,
          expectedReturnDate,
          loanNotes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      toast({
        title: "Movie loaned out",
        description: `${movie?.title} has been loaned to ${loanPersonName} with return date ${new Date(expectedReturnDate).toLocaleDateString()}.`,
      });
      setLoanPersonName("");
      setExpectedReturnDate("");
      setLoanNotes("");
      setShowLoanInput(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to loan movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const returnMovieMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('returnMovieMutation: Making API call to /api/movies/' + id + '/return');
      const response = await apiRequest(`/api/movies/${id}/return`, { method: 'PATCH' });
      console.log('returnMovieMutation: API response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('returnMovieMutation: Success, returned data:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      toast({
        title: "Movie returned",
        description: `${movie?.title} has been marked as returned.`,
      });
    },
    onError: (error: any) => {
      console.error('returnMovieMutation: Error occurred:', error);
      toast({
        title: "Failed to return movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const markWatchedMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/movies/${id}/watch`, { method: 'PUT' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      toast({
        title: "Marked as watched",
        description: `${movie?.title} has been marked as watched today.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark as watched",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });



  // Notes update mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!movie) throw new Error('No movie selected');
      return await apiRequest(`/api/movies/${movie.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: newNotes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      toast({
        title: "Notes updated",
        description: "Your notes have been saved successfully.",
      });
      setShowNotesEdit(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update notes",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Poster upload mutation
  const uploadPosterMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('[POSTER] Starting upload for movie:', movie?.id, movie?.title);
      const formData = new FormData();
      formData.append('poster', file);
      
      const response = await fetch('/api/upload/poster', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload poster');
      }
      
      const result = await response.json();
      console.log('[POSTER] Upload successful, received URL:', result.posterUrl);
      return result;
    },
    onMutate: () => {
      console.log('[POSTER] Setting upload state to true');
      setIsUploadingPoster(true);
    },
    onSuccess: async (data) => {
      console.log('[POSTER] Updating movie with poster URL:', data.posterUrl);
      try {
        // Update the movie with the new poster URL
        const updateResponse = await apiRequest(`/api/movies/${movie.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ posterUrl: data.posterUrl }),
        });
        
        console.log('[POSTER] Movie update response:', updateResponse);
        console.log('[POSTER] Movie updated, invalidating cache');
        
        // Invalidate both the movies list and individual movie queries
        await queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/movies', movie.id] });
        
        // Force refetch to ensure UI updates immediately
        await queryClient.refetchQueries({ queryKey: ['/api/movies'] });
        
        setIsUploadingPoster(false);
        
        toast({
          title: "Poster updated successfully",
          description: "Your custom poster has been uploaded and saved.",
        });
      } catch (error) {
        console.error('[POSTER] Error updating movie:', error);
        setIsUploadingPoster(false);
        toast({
          title: "Failed to save poster",
          description: "Poster uploaded but failed to save to movie.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('[POSTER] Upload failed:', error);
      setIsUploadingPoster(false);
      
      toast({
        title: "Failed to upload poster",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (!movie) return;
    console.log('Edit movie:', movie.id);
    setShowEditModal(true);
  };

  const updateLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      if (!movie) throw new Error('No movie selected');
      return await apiRequest(`/api/movies/${movie.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ location }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      toast({
        title: "Location updated",
        description: `${movie?.title} location has been updated.`,
      });
      setShowLocationInput(false);
      setNewLocation("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update location",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateLocation = () => {
    setNewLocation(movie?.location || "");
    setShowLocationInput(true);
  };

  const handleSaveLocation = () => {
    if (newLocation.trim()) {
      updateLocationMutation.mutate(newLocation.trim());
    }
  };

  const handleLoanOut = () => {
    if (loanPersonName.trim() && expectedReturnDate) {
      loanMovieMutation.mutate({ 
        id: movie.id, 
        loanedToName: loanPersonName.trim(),
        expectedReturnDate,
        loanNotes: loanNotes || undefined
      });
    }
  };

  const handlePosterUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('[POSTER] File selected:', file.name, 'Size:', file.size);
      uploadPosterMutation.mutate(file);
    }
  };

  const handleReturnMovie = () => {
    console.log('handleReturnMovie called for movie:', movie.id, movie.title);
    console.log('Movie isLoaned status:', movie.isLoaned);
    returnMovieMutation.mutate(movie.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${movie.title}" from your collection?`)) {
      deleteMovieMutation.mutate(movie.id);
    }
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const handleCancelNotes = () => {
    setNotes(movie?.notes || "");
    setShowNotesEdit(false);
  };

  if (!movie) return null;

  const handleOtherVersionSelect = (selectedMovie: Movie) => {
    if (onMovieSelect) {
      onMovieSelect(selectedMovie);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-secondary text-white border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{movie.title} Details</DialogTitle>
        
        {/* Header with Trailer/Backdrop */}
        <div className="relative">
          {(getTrailerUrl() || trailerData?.trailerUrl) ? (
            <div className="w-full h-64 relative">
              <iframe
                key={`trailer-${movie.id}-${audioEnabled ? 'unmuted' : 'muted'}`}
                src={`${getTrailerUrl() || trailerData.trailerUrl}?autoplay=1&mute=${audioEnabled ? '0' : '1'}&controls=1`}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title={`${movie.title} Trailer`}
              />
              
              {/* Audio Control Button */}
              <button
                onClick={() => {
                  setAudioEnabled(!audioEnabled);
                }}
                className={`absolute bottom-4 right-4 ${audioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white z-50 border border-white/30 backdrop-blur-sm transition-colors p-2 rounded`}
                title={audioEnabled ? "Disable audio" : "Enable audio"}
                style={{ zIndex: 9999 }}
              >
                {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </button>
            </div>
          ) : movie.backdropUrl ? (
            <img
              src={movie.backdropUrl}
              alt={`${movie.title} backdrop`}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-r from-gray-800 to-gray-700"></div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-app-secondary via-transparent to-transparent"></div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Movie Info */}
        <div className="p-6 -mt-20 relative z-10">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Poster */}
            <div className="flex-shrink-0">
              <div className="w-48 aspect-[2/3] bg-gray-800 rounded-lg shadow-xl overflow-hidden relative group">
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={`${movie.title} poster`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('[POSTER ERROR] Failed to load poster in detail modal:', movie.posterUrl, 'for movie:', movie.title);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('[POSTER SUCCESS] Loaded poster in detail modal:', movie.posterUrl, 'for movie:', movie.title);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🎬</div>
                      <p className="text-sm">No Poster</p>
                    </div>
                  </div>
                )}
                
                {/* Poster Upload Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPoster}
                    className="bg-app-accent hover:bg-orange-600 text-white text-sm px-3 py-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingPoster ? 'Uploading...' : 'Upload Poster'}
                  </Button>
                </div>
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePosterUpload}
                className="hidden"
              />
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{movie.title}</h1>
                <div className="flex items-center space-x-4 text-gray-400">
                  {movie.year && <span>{movie.year}</span>}
                  {movie.runtime && <span>{movie.runtime} min</span>}
                  {movie.rating && (
                    <Badge className="bg-app-accent text-white">{movie.rating}</Badge>
                  )}
                </div>
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="bg-gray-700 text-gray-300">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {movie.description && (
                <p className="text-gray-300 leading-relaxed">{movie.description}</p>
              )}

              {/* Ratings */}
              {movie.rottenTomatoesScore && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                      🍅
                    </div>
                    <span className="text-gray-300">
                      <span className="text-white font-medium">{movie.rottenTomatoesScore}%</span> on Rotten Tomatoes
                    </span>
                  </div>
                </div>
              )}

              {/* Director and Cast */}
              {(movie.director || (movie.cast && movie.cast.length > 0)) && (
                <div className="space-y-2">
                  {movie.director && (
                    <p className="text-sm">
                      <span className="text-app-accent font-medium">Director:</span>{" "}
                      <span className="text-gray-300">{movie.director}</span>
                    </p>
                  )}
                  {movie.cast && movie.cast.length > 0 && (
                    <p className="text-sm">
                      <span className="text-app-accent font-medium">Cast:</span>{" "}
                      <span className="text-gray-300">{movie.cast.slice(0, 5).join(", ")}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Version Information */}
              {(movie.edition || movie.catalogId || movie.isPrimary) && (
                <div className="bg-app-gray-800 border border-app-gray-600 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-3 flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    Version Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {movie.version && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Version Info</h4>
                        <p className="text-white">{movie.version}</p>
                      </div>
                    )}
                    {movie.edition && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Edition</h4>
                        <p className="text-white">{movie.edition}</p>
                      </div>
                    )}
                    {movie.catalogId && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Catalog Number</h4>
                        <p className="text-white font-mono">{movie.catalogId}</p>
                      </div>
                    )}
                    {movie.isPrimary === 1 && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Version Status</h4>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                          <span className="text-yellow-400 font-medium">Primary Version</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Additional version info */}
                  {(movie.barcode || movie.resaleValue) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-app-gray-600">
                      {movie.barcode && (
                        <div>
                          <h4 className="text-gray-400 text-sm font-medium mb-1">Barcode/UPC</h4>
                          <p className="text-white font-mono text-sm">{movie.barcode}</p>
                        </div>
                      )}
                      {movie.resaleValue && (
                        <div>
                          <h4 className="text-gray-400 text-sm font-medium mb-1">Estimated Value</h4>
                          <p className="text-green-400 font-semibold">${movie.resaleValue.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Other Versions */}
              {otherVersions.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  <h3 className="text-blue-400 font-medium mb-3 flex items-center">
                    <Copy className="h-4 w-4 mr-2" />
                    Other Versions in Collection ({otherVersions.length})
                  </h3>
                  <div className="space-y-2">
                    {otherVersions.map((version: Movie) => (
                      <div key={version.id} className="flex items-center justify-between bg-app-gray-750 p-3 rounded">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-300">
                              {version.format}
                            </Badge>
                            {version.edition && (
                              <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                                {version.edition}
                              </Badge>
                            )}
                            {version.isPrimary === 1 && (
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            )}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {version.catalogId && `Catalog: ${version.catalogId}`}
                            {version.condition && (
                              <span className="ml-2 text-yellow-400">
                                {"★".repeat(version.condition)}{"☆".repeat(5 - version.condition)}
                              </span>
                            )}
                            {version.resaleValue && (
                              <span className="ml-2 text-green-400">
                                ${version.resaleValue.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            if (onMovieSelect) {
                              onMovieSelect(version);
                            }
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collection Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-1">Format</h3>
                  <p className="text-white">{movie.format}</p>
                </div>
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-1">Location</h3>
                  <p className="text-white">{movie.location || 'Not specified'}</p>
                </div>
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-1">Condition</h3>
                  <div className="flex items-center space-x-1">
                    {movie.condition ? (
                      <>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < movie.condition! ? 'text-yellow-400 fill-current' : 'text-gray-500'
                            }`}
                          />
                        ))}
                        <span className="text-white ml-2">({movie.condition}/5)</span>
                      </>
                    ) : (
                      <span className="text-white">Not rated</span>
                    )}
                  </div>
                </div>
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-3">Personal Rating</h3>
                  <RatingSelector 
                    movie={movie} 
                    currentRating={movie.personalRating}
                  />
                </div>
              </div>

              {/* Technical Specifications */}
              {(movie.aspectRatio || movie.language || movie.audioFormat || movie.technicalSpecs) && (
                <div className="bg-app-gray-800 border border-app-gray-600 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-3">Technical Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {movie.aspectRatio && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Aspect Ratio</h4>
                        <p className="text-white">{movie.aspectRatio}</p>
                      </div>
                    )}
                    {movie.language && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Language</h4>
                        <p className="text-white">{movie.language}</p>
                      </div>
                    )}
                    {movie.audioFormat && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Audio Format</h4>
                        <p className="text-white">{movie.audioFormat}</p>
                      </div>
                    )}
                    {movie.technicalSpecs && (
                      <div>
                        <h4 className="text-gray-400 text-sm font-medium mb-1">Region/Format</h4>
                        <p className="text-white">{movie.technicalSpecs}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Last Watched Info */}
              <div className="bg-app-gray-750 p-4 rounded-lg">
                <h3 className="text-app-accent font-medium mb-1 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Last Watched
                </h3>
                <p className="text-white">
                  {movie.lastWatchedDate 
                    ? new Date(movie.lastWatchedDate).toLocaleDateString()
                    : 'Never watched'
                  }
                </p>
              </div>

              {/* Enhanced Loan Status */}
              {movie.isLoaned && movie.loanedToName && (
                <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg">
                  <h3 className="text-red-400 font-medium mb-3 flex items-center">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Currently Loaned Out
                  </h3>
                  <div className="space-y-2">
                    <p className="text-white">
                      <span className="font-medium">Borrowed by:</span> {movie.loanedToName}
                    </p>
                    {movie.loanDate && (
                      <p className="text-white">
                        <span className="font-medium">Loaned on:</span> {new Date(movie.loanDate).toLocaleDateString()}
                      </p>
                    )}
                    {movie.expectedReturnDate && (
                      <p className={`${
                        new Date(movie.expectedReturnDate) < new Date() 
                          ? 'text-red-300 font-semibold' 
                          : 'text-white'
                      }`}>
                        <span className="font-medium">Expected return:</span> {new Date(movie.expectedReturnDate).toLocaleDateString()}
                        {new Date(movie.expectedReturnDate) < new Date() && (
                          <span className="text-red-400 ml-2">(OVERDUE)</span>
                        )}
                      </p>
                    )}
                    {movie.loanNotes && (
                      <p className="text-gray-300 text-sm">
                        <span className="font-medium">Notes:</span> {movie.loanNotes}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleReturnMovie}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Mark as Returned
                  </Button>
                </div>
              )}

              {/* Personal Notes */}
              <div className="bg-app-gray-800 border border-app-gray-600 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-app-accent font-medium flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Personal Notes
                  </h3>
                  {!showNotesEdit && (
                    <Button
                      onClick={() => setShowNotesEdit(true)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      <Pen className="h-4 w-4 mr-1" />
                      {movie.notes ? 'Edit' : 'Add Notes'}
                    </Button>
                  )}
                </div>
                
                {showNotesEdit ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your thoughts, opinions, or reminders about this movie..."
                      className="w-full h-24 bg-app-gray-850 border border-gray-600 rounded-md p-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveNotes}
                        disabled={updateNotesMutation.isPending}
                        size="sm"
                        className="bg-app-accent hover:bg-orange-600"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancelNotes}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-300">
                    {movie.notes ? (
                      <p className="whitespace-pre-wrap">{movie.notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">No notes added yet. Click "Add Notes" to share your thoughts about this movie.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Enhanced Loan Input Form */}
              {showLoanInput && !movie.isLoaned && (
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-3">Loan Out Movie</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block">Person's Name</label>
                      <Input
                        type="text"
                        placeholder="Who are you lending this to?"
                        value={loanPersonName}
                        onChange={(e) => setLoanPersonName(e.target.value)}
                        className="bg-app-gray-850 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block">Expected Return Date</label>
                      <Input
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                        className="bg-app-gray-850 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block">Notes (Optional)</label>
                      <Input
                        type="text"
                        placeholder="Any special notes or reminders..."
                        value={loanNotes}
                        onChange={(e) => setLoanNotes(e.target.value)}
                        className="bg-app-gray-850 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleLoanOut}
                        disabled={!loanPersonName.trim() || !expectedReturnDate || loanMovieMutation.isPending}
                        className="bg-app-accent hover:bg-orange-600"
                      >
                        {loanMovieMutation.isPending ? 'Loaning...' : 'Loan Out'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowLoanInput(false);
                          setLoanPersonName("");
                          setExpectedReturnDate("");
                          setLoanNotes("");
                        }}
                        variant="outline"
                        className="border-gray-600 text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Update Input Form */}
              {showLocationInput && (
                <div className="bg-app-gray-750 p-4 rounded-lg">
                  <h3 className="text-app-accent font-medium mb-3">Update Location</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-300 text-sm mb-1 block">New Location</label>
                      <Input
                        type="text"
                        placeholder="Enter storage location (e.g. Shelf A, Box 3, Living Room)"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className="bg-app-gray-850 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveLocation}
                        disabled={!newLocation.trim() || updateLocationMutation.isPending}
                        className="bg-app-accent hover:bg-orange-600"
                      >
                        {updateLocationMutation.isPending ? 'Saving...' : 'Save Location'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowLocationInput(false);
                          setNewLocation("");
                        }}
                        variant="outline"
                        className="border-gray-600 text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  onClick={() => markWatchedMutation.mutate(movie.id)}
                  disabled={markWatchedMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {markWatchedMutation.isPending ? 'Marking...' : 'Mark as Watched'}
                </Button>
                <Button
                  onClick={handleEdit}
                  className="bg-app-accent hover:bg-orange-600"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={handleUpdateLocation}
                  variant="outline"
                  className="border-gray-600 text-white"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Update Location
                </Button>
                {!movie.isLoaned && (
                  <Button
                    onClick={() => setShowLoanInput(true)}
                    variant="outline"
                    className="border-gray-600 text-white"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Loan Out
                  </Button>
                )}
                <Button
                  onClick={handleDelete}
                  variant="destructive"
                  disabled={deleteMovieMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMovieMutation.isPending ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Edit Movie Modal */}
      {movie && (
        <EditMovieModal 
          movie={movie}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </Dialog>
  );
}
