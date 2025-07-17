import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Keyboard, ArrowLeft, Upload, X, Search, Film } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertMovieSchema, type InsertMovie } from "@shared/schema";

interface AddMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FORMATS = [
  'VHS', 'Betamax', 'LaserDisc', 'CED', 'VCD', 'S-VHS', 'MiniDV', 
  'DVD', 'HD DVD', 'Blu-ray', '4K Ultra HD Blu-ray'
];

export default function AddMovieModal({ isOpen, onClose }: AddMovieModalProps) {
  const [inputMethod, setInputMethod] = useState<'select' | 'title' | 'catalog' | 'manual'>('select');
  const [searchTitle, setSearchTitle] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("DVD");
  const [uploadedPoster, setUploadedPoster] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCatalogLookup, setIsCatalogLookup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertMovie>({
    resolver: zodResolver(insertMovieSchema),
    defaultValues: {
      title: "",
      year: undefined,
      runtime: undefined,
      rating: "",
      description: "",
      director: "",
      cast: [],
      genres: [],
      format: "DVD",
      location: "",
      catalogId: "",
      barcode: "",
      resaleValue: undefined,
      aspectRatio: "",
      language: "",
      audioFormat: "",
      technicalSpecs: "",
      youtubeTrailerUrl: "",
    },
  });

  // Search TMDb by title
  const { data: searchResults, refetch: searchTMDb, isLoading: isSearching } = useQuery({
    queryKey: [`/api/search/tmdb?query=${encodeURIComponent(searchTitle)}`],
    enabled: false,
  });

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
      
      if (result.status === 'success' && result.data) {
        const metadata = result.data;
        
        // Auto-populate form with scraped data
        form.setValue('title', metadata.title || '');
        form.setValue('country', metadata.country || '');
        form.setValue('year', metadata.year || undefined);
        form.setValue('description', metadata.description || '');
        form.setValue('runtime', metadata.runtime || undefined);
        form.setValue('pictureFormat', metadata.pictureFormat || '');
        form.setValue('catalogueNumber', catalogNum);
        form.setValue('director', metadata.director || '');
        form.setValue('actors', metadata.actors || []);
        form.setValue('youtubeTrailerUrl', metadata.youtubeTrailerUrl || '');
        form.setValue('infoPageLink', metadata.infoPageLink || '');
        
        if (metadata.coverUrl) {
          setUploadedPoster(metadata.coverUrl);
          form.setValue('posterUrl', metadata.coverUrl || '');
        }
        
        setInputMethod('manual');
        toast({
          title: "Catalog Found!",
          description: `Successfully found "${metadata.title}" for catalog number ${catalogNum}`,
        });
      } else {
        toast({
          title: "No Results Found",
          description: result.message || `No LDDB results found for catalog number ${catalogNum}. You can add the movie manually.`,
          variant: "destructive",
        });
        setInputMethod('manual');
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
      setSearchTitle("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTitleSearch = async () => {
    if (!searchTitle.trim()) return;
    await searchTMDb();
  };

  const handleTMDbSelect = async (tmdbMovie: any) => {
    try {
      const response = await fetch(`/api/tmdb/${tmdbMovie.tmdbId}`);
      const detailedMovie = await response.json();
      
      form.reset({
        ...detailedMovie,
        format: selectedFormat,
      });
      setInputMethod('manual');
    } catch (error) {
      toast({
        title: "Failed to fetch movie details",
        description: "Please try manual entry.",
        variant: "destructive",
      });
    }
  };

  // Poster upload mutation
  const uploadPosterMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('poster', file);
      
      const response = await fetch('/api/upload/poster', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload poster');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedPoster(data.posterUrl);
      form.setValue('posterUrl', data.posterUrl);
      toast({
        title: "Poster uploaded successfully",
        description: "Your custom poster has been uploaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upload poster",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePosterUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadPosterMutation.mutate(file);
      setIsUploading(false);
    }
  };

  const removePoster = () => {
    setUploadedPoster(null);
    form.setValue('posterUrl', '');
  };

  const onSubmit = (data: InsertMovie) => {
    // Use uploaded poster if available
    if (uploadedPoster) {
      data.posterUrl = uploadedPoster;
    }
    addMovieMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-secondary text-white border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Movie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {inputMethod === 'select' ? (
            <>
              {/* Method Selection */}
              <div className="text-center">
                <p className="text-gray-300 mb-4">Choose how you'd like to add your movie:</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setInputMethod('title')}
                  className="bg-app-accent hover:bg-orange-600 text-white flex items-center justify-center space-x-3 h-16"
                >
                  <Search className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Search by Title</div>
                    <div className="text-sm text-orange-200">Find movie online and select format</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setInputMethod('catalog')}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-3 h-16"
                >
                  <Keyboard className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Catalog Number Lookup</div>
                    <div className="text-sm text-blue-200">Auto-find from LaserDisc or other catalog numbers</div>
                  </div>
                </Button>

                <Button
                  onClick={() => setInputMethod('manual')}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center space-x-3 h-16"
                >
                  <Film className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Manual Entry</div>
                    <div className="text-sm text-gray-400">Enter all details manually</div>
                  </div>
                </Button>
              </div>
            </>
          ) : inputMethod === 'title' ? (
            <>
              {/* Back Button */}
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

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Select Format First:</label>
                <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {FORMATS.map((format) => (
                      <SelectItem key={format} value={format} className="text-white hover:bg-gray-600">
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Search Movie Database:</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter movie title to search TMDb"
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSearch()}
                  />
                  <Button 
                    onClick={handleTitleSearch}
                    disabled={isSearching || !searchTitle.trim()}
                    className="bg-app-accent hover:bg-orange-600"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Search Results ({selectedFormat} format):</h3>
                  {searchResults.length === 0 ? (
                    <p className="text-gray-400">No movies found. Try a different title or use manual entry.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((movie: any, index: number) => (
                        <div 
                          key={index}
                          className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer"
                          onClick={() => handleTMDbSelect(movie)}
                        >
                          {movie.posterUrl && (
                            <img 
                              src={movie.posterUrl} 
                              alt={movie.title}
                              className="w-12 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{movie.title}</h4>
                            <p className="text-sm text-gray-400">{movie.year} • {movie.runtime ? `${movie.runtime} min` : 'Runtime unknown'}</p>
                            <p className="text-xs text-gray-500 line-clamp-2">{movie.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : inputMethod === 'catalog' ? (
            <>
              {/* Back Button */}
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

              {/* Catalog Number Lookup */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-white mb-2">Catalog Number Lookup</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Enter a catalog number to automatically find movie details from LDDB.com
                  </p>
                </div>

                {/* Examples */}
                <div className="bg-gray-800 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">Examples:</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>• <span className="text-blue-300">PILF-1618</span> (LaserDisc)</div>
                    <div>• <span className="text-blue-300">MCA-85035</span> (VHS)</div>
                    <div>• <span className="text-blue-300">CC-1234</span> (Criterion Collection)</div>
                  </div>
                </div>

                {/* Catalog Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Catalog Number:</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter catalog number (e.g., PILF-1618)"
                      value={catalogNumber}
                      onChange={(e) => setCatalogNumber(e.target.value.trim())}
                      className="bg-gray-700 border-gray-600 text-white"
                      onKeyDown={(e) => e.key === 'Enter' && catalogNumber.trim() && lookupCatalogNumber(catalogNumber)}
                    />
                    <Button 
                      onClick={() => lookupCatalogNumber(catalogNumber)}
                      disabled={isCatalogLookup || !catalogNumber.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isCatalogLookup ? 'Looking up...' : 'Lookup'}
                    </Button>
                  </div>
                </div>

                {isCatalogLookup && (
                  <div className="text-center py-4">
                    <div className="text-gray-300">
                      Searching LDDB.com for catalog number {catalogNumber}...
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Checking LaserDisc Database for movie details
                    </div>
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mt-2"></div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Manual Entry Form */}
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
                          <FormLabel className="text-gray-300">Title</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              className="bg-gray-700 border-gray-600 text-white"
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Format</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-gray-700 border-gray-600">
                              {FORMATS.map((format) => (
                                <SelectItem key={format} value={format} className="text-white hover:bg-gray-600">
                                  {format}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                              className="bg-gray-700 border-gray-600 text-white"
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Rating</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PG, PG-13, R, etc." className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Catalog and Value */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="catalogId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Catalog Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="PILF-0002, CC-1234, etc." className="bg-gray-700 border-gray-600 text-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="resaleValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Estimated Value ($)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01"
                              placeholder="25.00"
                              className="bg-gray-700 border-gray-600 text-white"
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* People */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Storage Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Shelf A, Box 3, etc." className="bg-gray-700 border-gray-600 text-white" />
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

                  <FormField
                    control={form.control}
                    name="youtubeTrailerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">YouTube Trailer URL (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="https://www.youtube.com/watch?v=..." 
                            className="bg-gray-700 border-gray-600 text-white" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Technical Specifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Technical Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="aspectRatio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Aspect Ratio</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Select aspect ratio" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="4:3">4:3 (Full Screen)</SelectItem>
                                <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                                <SelectItem value="1.85:1">1.85:1 (Theater)</SelectItem>
                                <SelectItem value="2.35:1">2.35:1 (Anamorphic)</SelectItem>
                                <SelectItem value="2.39:1">2.39:1 (Cinemascope)</SelectItem>
                                <SelectItem value="1.33:1">1.33:1 (Academy)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Primary Language</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="English">English</SelectItem>
                                <SelectItem value="Japanese">Japanese</SelectItem>
                                <SelectItem value="French">French</SelectItem>
                                <SelectItem value="Spanish">Spanish</SelectItem>
                                <SelectItem value="German">German</SelectItem>
                                <SelectItem value="Italian">Italian</SelectItem>
                                <SelectItem value="Korean">Korean</SelectItem>
                                <SelectItem value="Chinese">Chinese</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="audioFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Audio Format</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Select audio format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Stereo">Stereo</SelectItem>
                                <SelectItem value="Dolby Digital">Dolby Digital</SelectItem>
                                <SelectItem value="Dolby Digital 5.1">Dolby Digital 5.1</SelectItem>
                                <SelectItem value="DTS">DTS</SelectItem>
                                <SelectItem value="DTS-HD">DTS-HD</SelectItem>
                                <SelectItem value="Dolby Atmos">Dolby Atmos</SelectItem>
                                <SelectItem value="AC3">AC3</SelectItem>
                                <SelectItem value="Surround Sound">Surround Sound</SelectItem>
                                <SelectItem value="Mono">Mono</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="technicalSpecs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Region/Format</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Select region/format" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="NTSC">NTSC</SelectItem>
                                <SelectItem value="PAL">PAL</SelectItem>
                                <SelectItem value="Japanese Import">Japanese Import</SelectItem>
                                <SelectItem value="Region 1">Region 1 (US/Canada)</SelectItem>
                                <SelectItem value="Region 2">Region 2 (Europe/Japan)</SelectItem>
                                <SelectItem value="Region 3">Region 3 (Asia)</SelectItem>
                                <SelectItem value="Region Free">Region Free</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="version"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Version/Edition</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Director's Cut, Criterion, etc." className="bg-gray-700 border-gray-600 text-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Custom Poster Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Custom Poster (Optional)</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePosterUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        disabled={isUploading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? 'Uploading...' : 'Upload Poster'}
                      </Button>
                      {uploadedPoster && (
                        <div className="flex items-center space-x-2">
                          <img src={uploadedPoster} alt="Uploaded poster" className="w-12 h-16 object-cover rounded" />
                          <Button
                            type="button"
                            onClick={removePoster}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
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
                      className="bg-app-accent hover:bg-orange-600"
                    >
                      {addMovieMutation.isPending ? 'Adding Movie...' : 'Add Movie'}
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}