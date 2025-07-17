import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, X } from "lucide-react";
import type { Movie } from "@shared/schema";
import { MAIN_GENRES, SUB_GENRES } from "@shared/genres";
import { ImageSelector } from "./image-selector";

const editMovieSchema = z.object({
  title: z.string().min(1, "Title is required"),
  country: z.string().optional(),
  year: z.number().min(1800).max(new Date().getFullYear() + 5).optional(),
  description: z.string().optional(),
  runtime: z.number().optional(),
  pictureFormat: z.string().optional(),
  catalogueNumber: z.string().optional(),
  director: z.string().optional(),
  actors: z.array(z.string()).default([]),
  genres: z.array(z.string()).min(1, "At least one genre is required"),
  subGenres: z.array(z.string()).default([]),
  format: z.string().min(1, "Format is required"),
  estimatedValue: z.number().optional(),
  condition: z.number().min(1).max(10).optional(),
  posterUrl: z.string().optional(),
  youtubeTrailerUrl: z.string().optional(),
  infoPageLink: z.string().optional(),
});

type EditMovieForm = z.infer<typeof editMovieSchema>;

interface EditMovieModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
}

export function EditMovieModal({ movie, isOpen, onClose }: EditMovieModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImageUrl, setSelectedImageUrl] = useState(movie.posterUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(movie.genres || []);
  const [selectedSubGenres, setSelectedSubGenres] = useState<string[]>(movie.subGenres || []);

  const form = useForm<EditMovieForm>({
    resolver: zodResolver(editMovieSchema),
    defaultValues: {
      title: movie.title,
      country: movie.country || "",
      year: movie.year || undefined,
      description: movie.description || "",
      runtime: movie.runtime || undefined,
      pictureFormat: movie.pictureFormat || "",
      catalogueNumber: movie.catalogueNumber || "",
      director: movie.director || "",
      actors: movie.actors || [],
      genres: movie.genres || [],
      subGenres: movie.subGenres || [],
      format: movie.format,
      estimatedValue: movie.estimatedValue ? Number(movie.estimatedValue) : undefined,
      condition: movie.condition || undefined,
      posterUrl: movie.posterUrl || "",
      youtubeTrailerUrl: movie.youtubeTrailerUrl || "",
      infoPageLink: movie.infoPageLink || "",
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('[EDIT MODAL] Starting image upload for movie:', movie?.id);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EDIT MODAL] Upload failed:', response.status, errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[EDIT MODAL] Upload successful:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('[EDIT MODAL] Image uploaded, updating movie with new image:', data.imageUrl);
      
      // Add the new image to available images and select it
      const currentAvailableImages = movie.availableImages || [];
      const newAvailableImages = [...currentAvailableImages, data.imageUrl];
      setSelectedImageUrl(data.imageUrl);
      
      try {
        // Update the movie in the backend with new available images
        await apiRequest(`/api/movies/${movie.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ 
            availableImages: newAvailableImages,
            posterUrl: data.imageUrl // Also set as current poster
          }),
        });
        
        // Invalidate cache to refresh UI
        await queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
        
        toast({
          title: "Success",
          description: "Image uploaded and saved successfully",
        });
        
        console.log('[EDIT MODAL] Movie updated successfully with new image');
      } catch (updateError) {
        console.error('[EDIT MODAL] Failed to update movie with new image:', updateError);
        toast({
          title: "Error",
          description: "Image uploaded but failed to save to movie",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error('[EDIT MODAL] Image upload failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const updateMovieMutation = useMutation({
    mutationFn: async (data: EditMovieForm) => {
      return await apiRequest(`/api/movies/${movie.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          posterUrl: selectedImageUrl
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Movie updated",
        description: "Movie details have been saved successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenreToggle = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    
    setSelectedGenres(newGenres);
    form.setValue('genres', newGenres);
    
    // Remove sub-genres that are no longer valid
    const validSubGenres = selectedSubGenres.filter(sg => 
      newGenres.some(g => SUB_GENRES[g]?.includes(sg))
    );
    setSelectedSubGenres(validSubGenres);
    form.setValue('subGenres', validSubGenres);
  };

  const handleSubGenreToggle = (subGenre: string) => {
    const newSubGenres = selectedSubGenres.includes(subGenre)
      ? selectedSubGenres.filter(sg => sg !== subGenre)
      : [...selectedSubGenres, subGenre];
    
    setSelectedSubGenres(newSubGenres);
    form.setValue('subGenres', newSubGenres);
  };

  // Get available sub-genres based on selected genres
  const availableSubGenres = selectedGenres.flatMap(genre => SUB_GENRES[genre] || []);

  const onSubmit = (data: EditMovieForm) => {
    updateMovieMutation.mutate(data);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
  };

  const handleUploadNew = () => {
    fileInputRef.current?.click();
  };

  // Create available images array for the selector
  const availableImages = [
    ...(movie.posterUrl ? [{
      url: movie.posterUrl,
      source: 'tmdb' as const,
      label: 'Current Poster',
      description: 'From TMDb database'
    }] : []),
    ...(movie.availableImages || []).map((url, index) => ({
      url,
      source: 'upload' as const,
      label: `Uploaded Image ${index + 1}`,
      description: 'User uploaded'
    }))
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-app-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center justify-between">
            Edit Movie: {movie.title}
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Title *</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-app-gray-750 border-gray-600 text-white" />
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
                    <FormLabel className="text-white">Year</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        className="bg-app-gray-750 border-gray-600 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="director"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Director</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-app-gray-750 border-gray-600 text-white" />
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
                    <FormLabel className="text-white">Runtime (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-app-gray-750 border-gray-600 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Country</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-app-gray-750 border-gray-600 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pictureFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Picture Format</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Pan & Scan, Widescreen" className="bg-app-gray-750 border-gray-600 text-white" />
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
                    <FormLabel className="text-white">Catalogue Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., PILF-1618, LV1234" className="bg-app-gray-750 border-gray-600 text-white" />
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
                    <FormLabel className="text-white">Format *</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="bg-app-gray-750 border-gray-600 text-white">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent className="bg-app-gray-750 border-gray-600">
                          <SelectItem value="DVD">DVD</SelectItem>
                          <SelectItem value="Blu-ray">Blu-ray</SelectItem>
                          <SelectItem value="4K UHD">4K UHD</SelectItem>
                          <SelectItem value="VHS">VHS</SelectItem>
                          <SelectItem value="LaserDisc">LaserDisc</SelectItem>
                          <SelectItem value="Digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Estimated Value ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        step="0.01"
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="bg-app-gray-750 border-gray-600 text-white" 
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
                    <FormLabel className="text-white">Condition (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        min="1"
                        max="10"
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="bg-app-gray-750 border-gray-600 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      className="bg-app-gray-750 border-gray-600 text-white" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* YouTube Trailer URL */}
            <FormField
              control={form.control}
              name="youtubeTrailerUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">YouTube Trailer URL (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="bg-app-gray-750 border-gray-600 text-white" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Genres */}
            <div className="space-y-4">
              <FormLabel className="text-white text-lg font-semibold">Genres *</FormLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {MAIN_GENRES.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                      id={genre}
                      checked={selectedGenres.includes(genre)}
                      onCheckedChange={() => handleGenreToggle(genre)}
                      className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <label
                      htmlFor={genre}
                      className="text-sm font-medium text-gray-300 cursor-pointer"
                    >
                      {genre}
                    </label>
                  </div>
                ))}
              </div>
              {form.formState.errors.genres && (
                <p className="text-sm text-red-400">{form.formState.errors.genres.message}</p>
              )}
            </div>

            {/* Sub-Genres */}
            {availableSubGenres.length > 0 && (
              <div className="space-y-4">
                <FormLabel className="text-white text-lg font-semibold">Sub-Genres</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableSubGenres.map((subGenre) => (
                    <div key={subGenre} className="flex items-center space-x-2">
                      <Checkbox
                        id={subGenre}
                        checked={selectedSubGenres.includes(subGenre)}
                        onCheckedChange={() => handleSubGenreToggle(subGenre)}
                        className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <label
                        htmlFor={subGenre}
                        className="text-sm font-medium text-gray-300 cursor-pointer"
                      >
                        {subGenre}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image Selection */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-semibold">Movie Poster Images</h3>
              <ImageSelector
                availableImages={availableImages}
                selectedImageUrl={selectedImageUrl}
                onImageSelect={setSelectedImageUrl}
                onUploadNew={handleUploadNew}
                previewHeight={180}
                allowUpload={true}
              />
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMovieMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {updateMovieMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}