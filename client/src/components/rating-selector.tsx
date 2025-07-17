import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Movie } from "@shared/schema";

interface RatingSelectorProps {
  movie: Movie;
  currentRating?: number | null;
  onRatingChange?: (rating: number) => void;
}

export default function RatingSelector({ movie, currentRating, onRatingChange }: RatingSelectorProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      return await apiRequest(`/api/movies/${movie.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ personalRating: rating }),
      });
    },
    onSuccess: (updatedMovie) => {
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/movies/recommended'] });
      toast({
        title: "Rating updated",
        description: `${movie.title} rated ${updatedMovie.personalRating}/5 stars.`,
      });
      if (onRatingChange) {
        onRatingChange(updatedMovie.personalRating);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update rating",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRatingClick = (rating: number) => {
    updateRatingMutation.mutate(rating);
  };

  const displayRating = hoveredRating || currentRating || 0;

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          disabled={updateRatingMutation.isPending}
          onClick={() => handleRatingClick(i + 1)}
          onMouseEnter={() => setHoveredRating(i + 1)}
          onMouseLeave={() => setHoveredRating(null)}
          className="focus:outline-none disabled:opacity-50 transition-all"
        >
          <Star
            className={`w-5 h-5 ${
              i < displayRating
                ? 'text-blue-400 fill-current' 
                : 'text-gray-500'
            } hover:text-blue-300 transition-colors`}
          />
        </button>
      ))}
      {(currentRating || hoveredRating) && (
        <span className="text-white ml-2 text-sm">
          ({displayRating}/5)
        </span>
      )}
    </div>
  );
}