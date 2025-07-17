import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertMovieSchema, type InsertMovie } from "@shared/schema";
import { MAIN_GENRES } from "@shared/genres";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Search, Upload, Image, Globe } from "lucide-react";

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const newMovieSchema = insertMovieSchema.extend({
  userId: z.number().optional(),
});

export default function AddMovieModal({ isOpen, onClose }: AddMovieModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputMethod, setInputMethod] = useState<'select' | 'title-search' | 'catalog-search' | 'manual'>('select');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isCatalogLookup, setIsCatalogLookup] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadedPoster, setUploadedPoster] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posterSource, setPosterSource] = useState<'upload' | 'tmdb' | 'lddb' | 'none'>('none');

  const form = useForm<InsertMovie>({
    resolver: zodResolver(newMovieSchema),
    defaultValues: {
      title: "",
      country: "",
      year: undefined,
      description: "",
      runtime: undefined,
      pictureFormat: "",
      catalogueNumber: "",
      director: "",
      actors: [],
      estimatedValue: undefined,
      condition: undefined,
      posterUrl: "",
      youtubeTrailerUrl: "",
      infoPageLink: "",
      genres: [],
      format: "DVD", // Default format
      location: "",
      // Loan tracking fields
      isLoaned: false,
      loanedToName: "",
      loanDate: undefined,
      expectedReturnDate: undefined,
      actualReturnDate: undefined,
      loanNotes: "",
    },
  });

  // Smart search that detects catalog numbers vs movie titles and combines data sources
  const handleSmartSearch = async () => {
    if (!searchQuery.trim() && !catalogNumber.trim()) {
      console.log('[SMART SEARCH] No fields provided, returning');
      return;
    }
    
    // Detect patterns in both fields - enhanced catalog detection
    const catalogPattern = /^[A-Z]{2,6}[-\s]?\d{3,6}$|^\d{4,6}$|^[A-Z]{2,4}-\d+$/i;
    const hasPrimaryField = searchQuery.trim();
    const hasSecondaryField = catalogNumber.trim();
    const isPrimaryCatalog = hasPrimaryField && catalogPattern.test(searchQuery.trim());
    const isSecondaryCatalog = hasSecondaryField && catalogPattern.test(catalogNumber.trim());
    
    console.log('[SMART SEARCH] Starting with:', { 
      searchQuery: searchQuery.trim(), 
      catalogNumber: catalogNumber.trim(),
      isPrimaryCatalog,
      isSecondaryCatalog,
      hasPrimaryField: !!hasPrimaryField,
      hasSecondaryField: !!hasSecondaryField
    });
    
    // Determine search strategy based on what fields we have
    if (hasPrimaryField && hasSecondaryField) {
      // Both fields provided - combine both sources
      if (isPrimaryCatalog && !isSecondaryCatalog) {
        // Primary=catalog, Secondary=title: Search catalog first, enhance with TMDb
        toast({
          title: "Searching Both Sources",
          description: `Getting catalog data for "${searchQuery.trim()}" and enhancing with TMDb data for "${catalogNumber.trim()}"...`,
        });
        await lookupCatalogNumber(searchQuery.trim());
        await enhanceWithTMDbData(catalogNumber.trim());
      } else if (!isPrimaryCatalog && isSecondaryCatalog) {
        // Primary=title, Secondary=catalog: Search TMDb first, enhance with catalog
        toast({
          title: "Searching Both Sources", 
          description: `Getting movie data for "${searchQuery.trim()}" and enhancing with catalog data for "${catalogNumber.trim()}"...`,
        });
        // First, try TMDb search
        setIsSearching(true);
        let tmdbSuccess = false;
        
        try {
          const response = await fetch(`/api/movies/search?q=${encodeURIComponent(searchQuery.trim())}`);
          console.log('TMDb API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('TMDb API response data:', data);
            
            if (data.results && data.results.length > 0) {
              // TMDb found results - show them immediately
              console.log('About to set search results and show results...');
              setSearchResults(data.results);
              setShowResults(true);
              tmdbSuccess = true;
              
              console.log('TMDb search successful in dual-field mode, showing', data.results.length, 'results');
              console.log('tmdbSuccess is now:', tmdbSuccess);
            } else {
              console.log('TMDb search returned no results for query:', searchQuery.trim());
            }
          } else {
            console.log('TMDb API request failed with status:', response.status);
          }
        } catch (error) {
          console.error('TMDb search failed with error:', error);
        }
        
        setIsSearching(false);
        
        console.log('After try/catch, tmdbSuccess is:', tmdbSuccess);
        
        if (tmdbSuccess) {
          // TMDb worked - now enhance with catalog data in background
          console.log('TMDb succeeded, showing enhancement toast');
          toast({
            title: "Enhancing with LDDB",
            description: `Adding catalog details for "${catalogNumber.trim()}"...`,
          });
          
          // Run catalog enhancement completely separately - longer delay to ensure TMDb results are displayed
          setTimeout(() => {
            enhanceWithCatalogData(catalogNumber.trim()).catch(catalogError => {
              console.log('Catalog enhancement failed, but TMDb results are available:', catalogError);
            });
          }, 1000);
        } else {
          // TMDb failed - use catalog only as fallback
          console.log('TMDb failed for query "' + searchQuery.trim() + '", falling back to catalog search');
          await lookupCatalogNumber(catalogNumber.trim());
        }
      } else if (!isPrimaryCatalog && !isSecondaryCatalog) {
        // Both are titles - search primary title only
        toast({
          title: "Movie Search",
          description: `Searching TMDb database for "${searchQuery.trim()}"...`,
        });
        await handleTitleSearch(searchQuery.trim());
      } else {
        // Both are catalogs - search primary catalog only
        toast({
          title: "Catalog Search",
          description: `Searching LaserDisc database for catalog "${searchQuery.trim()}"...`,
        });
        await lookupCatalogNumber(searchQuery.trim());
      }
    } else if (hasPrimaryField) {
      // Only primary field provided
      if (isPrimaryCatalog) {
        toast({
          title: "Catalog Search",
          description: `Searching LaserDisc database for catalog "${searchQuery.trim()}"...`,
        });
        await lookupCatalogNumber(searchQuery.trim());
      } else {
        toast({
          title: "Movie Search",
          description: `Searching TMDb database for "${searchQuery.trim()}"...`,
        });
        await handleTitleSearch(searchQuery.trim());
      }
    } else if (hasSecondaryField) {
      // Only secondary field provided
      console.log('[SMART SEARCH] Only secondary field provided:', catalogNumber.trim(), 'isSecondaryCatalog:', isSecondaryCatalog);
      if (isSecondaryCatalog) {
        toast({
          title: "Catalog Search",
          description: `Searching LaserDisc database for catalog "${catalogNumber.trim()}"...`,
        });
        await lookupCatalogNumber(catalogNumber.trim());
      } else {
        toast({
          title: "Movie Search",
          description: `Searching TMDb database for "${catalogNumber.trim()}"...`,
        });
        await handleTitleSearch(catalogNumber.trim());
      }
    }
  };

  // Helper function to handle TMDb search with catalog fallback
  const handleTMDbSearchWithCatalogFallback = async (title: string, catalog: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          // TMDb found results - show them
          setSearchResults(data.results);
          setShowResults(true);
          
          // Also enhance with catalog data silently
          enhanceWithCatalogData(catalog).catch(catalogError => {
            console.log('Catalog enhancement failed, but TMDb results are available:', catalogError);
            // Don't show error to user since TMDb worked
          });
        } else {
          // No TMDb results - fall back to catalog only
          toast({
            title: "No TMDb Results - Using Catalog",
            description: `"${title}" not found in TMDb. Using catalog "${catalog}" from LDDB instead...`,
          });
          await lookupCatalogNumber(catalog);
        }
      } else {
        // If TMDb API call fails, try catalog as backup
        console.log('TMDb API failed, falling back to catalog search');
        await lookupCatalogNumber(catalog);
      }
    } catch (error) {
      console.error('TMDb search with catalog fallback error:', error);
      // Try catalog as final fallback if TMDb completely fails
      try {
        await lookupCatalogNumber(catalog);
      } catch (catalogError) {
        // Only show error if both sources completely fail
        toast({
          title: "Search Error", 
          description: "Failed to search both TMDb and LDDB databases. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Enhanced TMDb data fetching that preserves existing form data
  const enhanceWithTMDbData = async (title: string) => {
    try {
      setIsSearching(true);
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(title)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const movie = data.results[0]; // Take first result for enhancement
          const detailResponse = await fetch(`/api/movies/tmdb/${movie.tmdbId}`);
          if (detailResponse.ok) {
            const detailedMovie = await detailResponse.json();
            
            // Enhance existing form data without overwriting LDDB data
            if (!form.getValues('description') && detailedMovie.description) {
              form.setValue('description', detailedMovie.description);
            }
            if (!form.getValues('director') && detailedMovie.director) {
              form.setValue('director', detailedMovie.director);
            }
            if (!form.getValues('actors')?.length && detailedMovie.cast?.length) {
              form.setValue('actors', detailedMovie.cast);
            }
            if (!form.getValues('posterUrl') && detailedMovie.posterUrl) {
              form.setValue('posterUrl', detailedMovie.posterUrl);
            }
            if (!form.getValues('youtubeTrailerUrl') && detailedMovie.youtubeTrailerUrl) {
              form.setValue('youtubeTrailerUrl', detailedMovie.youtubeTrailerUrl);
            }
            
            toast({
              title: "Enhanced with TMDb",
              description: "Added rich descriptions, cast info, and trailer from TMDb",
            });
          }
        } else {
          // No TMDb results found during enhancement - just note it
          toast({
            title: "TMDb Enhancement Skipped",
            description: `No TMDb match found for "${title}". Proceeding with catalog data only.`,
          });
        }
      }
    } catch (error) {
      console.error('TMDb enhancement error:', error);
      toast({
        title: "TMDb Enhancement Failed",
        description: "Could not connect to TMDb. Proceeding with catalog data only.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Enhanced catalog data fetching that preserves existing form data  
  const enhanceWithCatalogData = async (catalogNum: string) => {
    try {
      setIsCatalogLookup(true);
      const response = await fetch('/api/lookup/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog_number: catalogNum }),
      });
      
      if (!response.ok) {
        throw new Error(`Catalog lookup failed: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.status === 'success' && result.data?.data) {
        const metadata = result.data.data;
        
        // Enhance existing form data without overwriting TMDb data
        // Always set catalog number
        form.setValue('catalogueNumber', catalogNum);
        
        // Only add data if field is empty (don't overwrite TMDb data)
        if (!form.getValues('country') && metadata.country) {
          form.setValue('country', metadata.country);
        }
        if (!form.getValues('pictureFormat') && metadata.pictureFormat) {
          form.setValue('pictureFormat', metadata.pictureFormat);
        }
        // Don't overwrite runtime if TMDb already provided it
        if (!form.getValues('runtime') && metadata.runtime) {
          form.setValue('runtime', metadata.runtime);
        }
        // Don't overwrite format if already set
        if (!form.getValues('format') && metadata.format) {
          form.setValue('format', metadata.format);
        }
        // Never overwrite description - TMDb descriptions are much better
        // (LDDB descriptions are often just titles or empty)
        
        toast({
          title: "Enhanced with LDDB",
          description: "Added catalog specs, picture format, and technical details",
        });
      } else {
        console.log('No catalog data found for enhancement');
      }
    } catch (error) {
      console.error('Catalog enhancement error:', error);
      // Don't rethrow - let it fail silently since TMDb worked
    } finally {
      setIsCatalogLookup(false);
    }
  };

  // TMDb movie search with fallback
  const handleTitleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    let searchSuccessful = false;
    
    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setShowResults(true);
          searchSuccessful = true;
          console.log('TMDb search successful with', data.results.length, 'results');
        } else {
          // No TMDb results found - that's it when only searching by title
          toast({
            title: "No TMDb Results",
            description: `No movies found for "${query}" in TMDb database.`,
          });
        }
      } else {
        // TMDb API request failed
        toast({
          title: "Search Error",
          description: "Failed to connect to movie database. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Movie search error:', error);
      // Only show error if search was not successful
      if (!searchSuccessful) {
        toast({
          title: "Search Error", 
          description: "Failed to search movie database. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Select movie from search results and fetch detailed info
  const selectMovieFromSearch = async (movie: any) => {
    setIsSearching(true);
    try {
      // Fetch detailed movie information from TMDb
      const response = await fetch(`/api/movies/tmdb/${movie.tmdbId}`);
      if (response.ok) {
        const detailedMovie = await response.json();
        
        // Auto-populate form with detailed movie data
        form.setValue('title', detailedMovie.title || '');
        form.setValue('year', detailedMovie.year || undefined);
        form.setValue('description', detailedMovie.description || '');
        form.setValue('runtime', detailedMovie.runtime || undefined);
        form.setValue('director', detailedMovie.director || '');
        form.setValue('actors', detailedMovie.cast || []);
        form.setValue('genres', detailedMovie.genres || ['Drama']);
        form.setValue('posterUrl', detailedMovie.posterUrl || '');
        form.setValue('infoPageLink', detailedMovie.infoPageLink || '');
        // Set catalog number if provided in title search
        if (catalogNumber.trim()) {
          form.setValue('catalogueNumber', catalogNumber.trim());
        }
        // TMDb searches default to DVD format unless already set
        if (!form.getValues('format')) {
          form.setValue('format', 'DVD');
        }
        // Auto-fetch YouTube trailer if available
        if (detailedMovie.youtubeTrailerUrl) {
          form.setValue('youtubeTrailerUrl', detailedMovie.youtubeTrailerUrl);
        }
        
        toast({
          title: "Movie Details Loaded",
          description: `Loaded detailed information for "${detailedMovie.title}"`,
        });
      } else {
        // Fallback to basic search data if detailed fetch fails
        form.setValue('title', movie.title || '');
        form.setValue('year', movie.release_date ? parseInt(movie.release_date.split('-')[0]) : undefined);
        form.setValue('description', movie.overview || '');
        form.setValue('posterUrl', movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '');
        
        // Convert TMDb genres to our format
        const genres = movie.genre_ids ? movie.genre_ids.map((id: number) => {
          const genreMap: Record<number, string> = {
            28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
            99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'Historical',
            27: 'Horror', 10402: 'Musical', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
            10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
          };
          return genreMap[id] || 'Drama';
        }) : ['Drama'];
        
        form.setValue('genres', genres);
      }
      
      setInputMethod('manual');
    } catch (error) {
      console.error('Error fetching movie details:', error);
      // Don't show error toast - just use fallback data silently
      
      // Fallback to basic data
      form.setValue('title', movie.title || '');
      form.setValue('year', movie.release_date ? parseInt(movie.release_date.split('-')[0]) : undefined);
      form.setValue('description', movie.overview || '');
      form.setValue('posterUrl', movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '');
      form.setValue('genres', ['Drama']);
      setInputMethod('manual');
    } finally {
      setIsSearching(false);
    }
  };

  // Catalog number lookup
  const lookupCatalogNumber = async (catalogNum: string) => {
    setIsCatalogLookup(true);
    try {
      const response = await fetch('/api/lookup/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ catalog_number: catalogNum }),
      });

      const result = await response.json();
      
      if (result.status === 'success' && result.data && result.data.data) {
        const metadata = result.data.data;
        
        // Auto-populate form with scraped data (catalog-only search)
        form.setValue('title', metadata.title || '');
        form.setValue('country', metadata.country || '');
        form.setValue('year', metadata.year || undefined);
        form.setValue('description', metadata.description || '');
        form.setValue('runtime', metadata.runtime || undefined);
        form.setValue('pictureFormat', metadata.pictureFormat || '');
        form.setValue('catalogueNumber', catalogNum);
        form.setValue('director', metadata.director || '');
        form.setValue('actors', metadata.actors || []);
        // Ensure we always have at least one genre for frontend compatibility
        const genres = metadata.genres && metadata.genres.length > 0 ? metadata.genres : ['Drama'];
        form.setValue('genres', genres);
        form.setValue('youtubeTrailerUrl', metadata.youtubeTrailerUrl || '');
        form.setValue('infoPageLink', metadata.infoPageLink || '');
        // Set format - LDDB catalog lookups are always LaserDisc
        form.setValue('format', 'LaserDisc');
        
        if (metadata.coverUrl) {
          setUploadedPoster(metadata.coverUrl);
          form.setValue('posterUrl', metadata.coverUrl || '');
        }
        
        setInputMethod('manual');
        toast({
          title: "Catalog Found!",
          description: `Successfully found "${metadata.title}" for catalog number ${catalogNum}. You can now add the movie or search for additional details.`,
        });
      } else {
        toast({
          title: "No Catalog Results Found",
          description: result.message || `No LDDB results found for catalog number ${catalogNum}. You can add the movie manually.`,
          variant: "destructive",
        });
        // Just show the error - no fallback to manual mode
      }
    } catch (error) {
      console.error('Catalog lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: "Unable to search catalog database. Please add the movie manually.",
        variant: "destructive",
      });
      setInputMethod('manual');
    } finally {
      setIsCatalogLookup(false);
    }
  };

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('[IMAGE UPLOAD] Starting upload:', file.name);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const result = await response.json();
      console.log('[IMAGE UPLOAD] Upload successful:', result.imageUrl);
      return result;
    },
    onMutate: () => {
      setIsUploadingImage(true);
    },
    onSuccess: (data) => {
      setUploadedPoster(data.imageUrl);
      setImagePreview(data.imageUrl);
      setPosterSource('upload');
      form.setValue('posterUrl', data.imageUrl);
      setIsUploadingImage(false);
      toast({
        title: "Image uploaded successfully",
        description: "Your custom image is ready to use.",
      });
    },
    onError: (error: any) => {
      console.error('[IMAGE UPLOAD] Upload failed:', error);
      setIsUploadingImage(false);
      toast({
        title: "Failed to upload image",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, WebP).",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      uploadImageMutation.mutate(file);
    }
  };

  // Add movie mutation
  const addMovieMutation = useMutation({
    mutationFn: async (data: InsertMovie) => {
      return await apiRequest('/api/movies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Movie added successfully",
        description: "The movie has been added to your collection.",
      });
      onClose();
      form.reset();
      setInputMethod('select');
      setCatalogNumber('');
      setSearchQuery('');
      setSearchResults([]);
      setUploadedPoster(null);
      setImagePreview(null);
      setPosterSource('none');
    },
    onError: (error: any) => {
      console.error('Add movie error:', error);
      toast({
        title: "Failed to add movie",
        description: error?.message || "An error occurred while adding the movie.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMovie) => {
    // Ensure at least one genre is provided
    if (!data.genres || data.genres.length === 0) {
      toast({
        title: "Genre Required",
        description: "Please add at least one genre for the movie to appear in the frontend.",
        variant: "destructive",
      });
      return;
    }

    // Ensure format is provided
    if (!data.format) {
      toast({
        title: "Format Required",
        description: "Please select a media format for the movie.",
        variant: "destructive",
      });
      return;
    }

    const movieData = {
      ...data,
      posterUrl: uploadedPoster || data.posterUrl || "",
    };
    
    addMovieMutation.mutate(movieData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Add New Movie
          </DialogTitle>
        </DialogHeader>

        {inputMethod === 'select' && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm mb-2">
              Choose how you'd like to add your movie:
            </p>
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-xs">
                💡 <strong>Smart Search:</strong> Enter any movie title OR catalog number. We automatically detect which one you entered and search the best database for that type of information, including YouTube trailers!
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => setInputMethod('smart-search')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 h-auto border-2 border-blue-500"
                variant="outline"
              >
                <Search className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">🔍 Smart Search (Recommended)</div>
                  <div className="text-xs text-blue-200">Enter movie title OR catalog number - automatically detected</div>
                </div>
              </Button>
              
              <Button
                onClick={() => setInputMethod('manual')}
                className="bg-gray-600 hover:bg-gray-700 text-white p-4 h-auto"
                variant="outline"
              >
                <div className="text-left">
                  <div className="font-medium">✏️ Manual Entry</div>
                  <div className="text-xs text-gray-300">Enter all movie details manually</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {inputMethod === 'smart-search' && (
          <>
            <div className="flex items-center mb-4">
              <Button
                onClick={() => setInputMethod('select')}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white p-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to options
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-white">🔍 Smart Movie Search</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Enter a movie title OR catalog number - we'll find the best data source
                </p>
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mt-3">
                  <p className="text-blue-300 text-xs">
                    <strong>How it works:</strong> Movie titles search TMDb for rich metadata. Catalog numbers search LDDB for technical specs. 
                    Enter both for the ultimate combination of quality data from both sources!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Movie Title or Catalog Number:</label>
                  <Input
                    placeholder="e.g., The Matrix OR PILF-1618"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && (searchQuery.trim() || catalogNumber.trim()) && handleSmartSearch()}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Additional Info <span className="text-gray-500">(optional)</span>:
                  </label>
                  <Input
                    placeholder="Catalog number if title above, or title if catalog above"
                    value={catalogNumber}
                    onChange={(e) => setCatalogNumber(e.target.value.trim())}
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && (searchQuery.trim() || catalogNumber.trim()) && handleSmartSearch()}
                  />
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={handleSmartSearch}
                  disabled={isSearching || isCatalogLookup || (!searchQuery.trim() && !catalogNumber.trim())}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                >
                  {isSearching || isCatalogLookup ? 'Searching...' : 'Smart Search'}
                </Button>
              </div>

              {isSearching && (
                <div className="text-center py-4">
                  <div className="text-gray-300">Searching TMDb for "{searchQuery}"...</div>
                  <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mt-2"></div>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-300">
                    Found {searchResults.length} results:
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.map((movie, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                        onClick={() => selectMovieFromSearch(movie)}
                      >
                        {movie.poster_path && (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-12 h-18 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-white">{movie.title}</div>
                          {movie.release_date && (
                            <div className="text-sm text-gray-400">
                              {new Date(movie.release_date).getFullYear()}
                            </div>
                          )}
                          {movie.overview && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {movie.overview.substring(0, 120)}...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  No movies found for "{searchQuery}". Try a different search term.
                </div>
              )}
            </div>
          </>
        )}



        {inputMethod === 'manual' && (
          <>
            <div className="flex items-center mb-4">
              <Button
                onClick={() => setInputMethod('select')}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white p-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to options
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Title *</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Media Format *</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Format</option>
                            <option value="LaserDisc">LaserDisc</option>
                            <option value="DVD">DVD</option>
                            <option value="Blu-ray">Blu-ray</option>
                            <option value="4K UHD">4K UHD</option>
                            <option value="VHS">VHS</option>
                            <option value="Betamax">Betamax</option>
                            <option value="Digital">Digital</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., USA, Japan" className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Year</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="bg-gray-700 border-gray-600 text-white" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="runtime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Runtime (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="bg-gray-700 border-gray-600 text-white" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="bg-gray-700 border-gray-600 text-white" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pictureFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Picture Format</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Widescreen, Pan & Scan" className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="catalogueNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Catalogue Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., PILF-1618, LV1234" className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Shelf A1, Living Room" className="bg-gray-700 border-gray-600 text-white" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="director"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Director</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-gray-700 border-gray-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Actors (comma-separated)</FormLabel>
                      <FormControl>
                        <Input 
                          value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                          onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="Actor 1, Actor 2, Actor 3"
                          className="bg-gray-700 border-gray-600 text-white" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Genres (comma-separated) *</FormLabel>
                      <FormControl>
                        <Input 
                          value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                          onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="Action, Drama, Comedy, Science Fiction"
                          className="bg-gray-700 border-gray-600 text-white" 
                          required
                        />
                      </FormControl>
                      <div className="text-xs text-gray-400 mt-1">
                        Available: {MAIN_GENRES.slice(0, 6).join(', ')}, etc.
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Estimated Value ($)</FormLabel>
                        <FormControl>
                          <Input 
                            value={field.value !== undefined ? field.value.toString() : ''}
                            type="number" 
                            step="0.01"
                            placeholder="0.00"
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? undefined : parseFloat(value) || 0);
                            }}
                            className="bg-gray-700 border-gray-600 text-white" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Condition (1-10 stars)</FormLabel>
                        <FormControl>
                          <Input 
                            value={field.value !== undefined ? field.value.toString() : ''}
                            type="number" 
                            min="1" 
                            max="10"
                            placeholder="1-10"
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? undefined : parseInt(value) || 1);
                            }}
                            className="bg-gray-700 border-gray-600 text-white" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="youtubeTrailerUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">YouTube Trailer URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.youtube.com/watch?v=..." className="bg-gray-700 border-gray-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="infoPageLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Info Page Link</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Source URL (LDDB, IMDb, etc.)" className="bg-gray-700 border-gray-600 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Poster Selection Section */}
                <div className="space-y-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white">Movie Poster</h3>
                  
                  {/* Poster Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Upload Your Own Image */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Upload size={16} />
                        Upload Your Own
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="image-upload"
                          disabled={isUploadingImage}
                        />
                        <label
                          htmlFor="image-upload"
                          className={`block w-full p-3 border-2 border-dashed border-gray-500 rounded-lg text-center cursor-pointer hover:border-orange-500 transition-colors ${
                            isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isUploadingImage ? (
                            <div className="text-gray-400">Uploading...</div>
                          ) : (
                            <div className="text-gray-400">
                              <Upload className="mx-auto mb-2" size={24} />
                              Click to upload
                              <div className="text-xs mt-1">JPG, PNG, WebP (max 5MB)</div>
                            </div>
                          )}
                        </label>
                        {posterSource === 'upload' && imagePreview && (
                          <div className="mt-2">
                            <img
                              src={imagePreview}
                              alt="Uploaded poster"
                              className="w-full h-32 object-cover rounded border border-green-500"
                            />
                            <div className="text-xs text-green-400 mt-1">✓ Custom image uploaded</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Use TMDb Image */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Image size={16} />
                        TMDb Database
                      </label>
                      <div className="space-y-2">
                        {form.watch('posterUrl') && !form.watch('posterUrl')?.includes('/images/') && !form.watch('posterUrl')?.includes('/uploads/') ? (
                          <div>
                            <img
                              src={form.watch('posterUrl')}
                              alt="TMDb poster"
                              className="w-full h-32 object-cover rounded border border-blue-500"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setPosterSource('tmdb');
                                setImagePreview(form.watch('posterUrl'));
                              }}
                              className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                            >
                              Use TMDb Image
                            </Button>
                            {posterSource === 'tmdb' && (
                              <div className="text-xs text-blue-400 mt-1">✓ Using TMDb image</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 p-3 border border-gray-600 rounded">
                            Search for a movie to get TMDb poster
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Use External URL */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Globe size={16} />
                        External URL
                      </label>
                      <div className="space-y-2">
                        <Input
                          placeholder="https://..."
                          value={form.watch('posterUrl') || ''}
                          onChange={(e) => {
                            form.setValue('posterUrl', e.target.value);
                            if (e.target.value && !e.target.value.includes('/images/') && !e.target.value.includes('/uploads/')) {
                              setPosterSource('lddb');
                              setImagePreview(e.target.value);
                            }
                          }}
                          className="bg-gray-600 border-gray-500 text-white text-sm"
                        />
                        {form.watch('posterUrl') && !form.watch('posterUrl')?.includes('/images/') && !form.watch('posterUrl')?.includes('/uploads/') && (
                          <div>
                            <img
                              src={form.watch('posterUrl')}
                              alt="External poster"
                              className="w-full h-32 object-cover rounded border border-purple-500"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {posterSource === 'lddb' && (
                              <div className="text-xs text-purple-400 mt-1">✓ Using external image</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Current Selection Display */}
                  {imagePreview && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Selected Poster:</label>
                      <div className="flex items-start gap-4">
                        <img
                          src={imagePreview}
                          alt="Selected poster"
                          className="w-24 h-36 object-cover rounded border border-orange-500"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="text-sm text-gray-300">
                            <span className="font-medium">Source:</span>{' '}
                            {posterSource === 'upload' && 'Custom Upload'}
                            {posterSource === 'tmdb' && 'TMDb Database'}
                            {posterSource === 'lddb' && 'External URL'}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setImagePreview(null);
                              setPosterSource('none');
                              form.setValue('posterUrl', '');
                            }}
                            className="border-gray-500 text-gray-300 hover:bg-gray-600"
                          >
                            Clear Selection
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    onClick={onClose} 
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addMovieMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {addMovieMutation.isPending ? 'Adding...' : 'Add Movie'}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}