import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserX, Calendar, AlertTriangle, Search, Filter, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Movie } from "@shared/schema";

export default function Loans() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all loaned movies
  const { data: loanedMovies = [], isLoading } = useQuery({
    queryKey: ['/api/loans'],
  });

  // Fetch overdue loans
  const { data: overdueMovies = [] } = useQuery({
    queryKey: ['/api/loans/overdue'],
  });

  // Return movie mutation
  const returnMovieMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Loans page: Making API call to /api/movies/' + id + '/return');
      return await apiRequest(`/api/movies/${id}/return`, { method: 'PATCH' });
    },
    onSuccess: (data, movieId) => {
      const movie = loanedMovies.find((m: Movie) => m.id === movieId);
      queryClient.invalidateQueries({ queryKey: ['/api/loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/loans/overdue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Movie returned",
        description: `${movie?.title} has been marked as returned.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to return movie",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter movies based on search and overdue filter
  const filteredMovies = (showOverdueOnly ? overdueMovies : loanedMovies).filter((movie: Movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    movie.loanedToName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isOverdue = (expectedReturnDate: string | null) => {
    if (!expectedReturnDate) return false;
    return new Date(expectedReturnDate) < new Date();
  };

  const formatDaysOverdue = (expectedReturnDate: string) => {
    const returnDate = new Date(expectedReturnDate);
    const today = new Date();
    const diffTime = today.getTime() - returnDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white hover:bg-app-gray-700 p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Collection
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Loan Management</h1>
          <p className="text-gray-400">
            Track movies you've loaned out and manage returns
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <Badge variant="outline" className="text-blue-300 border-blue-500">
            {loanedMovies.length} Total Loans
          </Badge>
          {overdueMovies.length > 0 && (
            <Badge variant="destructive" className="bg-red-600">
              {overdueMovies.length} Overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by movie title or borrower name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-app-gray-750 border-gray-600 text-white"
          />
        </div>
        <Button
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          variant={showOverdueOnly ? "default" : "outline"}
          className={showOverdueOnly 
            ? "bg-red-600 hover:bg-red-700" 
            : "border-gray-600 text-white"
          }
        >
          <Filter className="h-4 w-4 mr-2" />
          {showOverdueOnly ? "Show All" : "Overdue Only"}
        </Button>
      </div>

      {/* Loans List */}
      {filteredMovies.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            {loanedMovies.length === 0 ? (
              <>
                <UserX className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No Active Loans</h3>
                <p>You haven't loaned out any movies yet.</p>
              </>
            ) : (
              <>
                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No Results Found</h3>
                <p>Try adjusting your search or filter settings.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMovies.map((movie: Movie) => {
            const overdue = movie.expectedReturnDate && isOverdue(movie.expectedReturnDate);
            const daysOverdue = overdue ? formatDaysOverdue(movie.expectedReturnDate!) : 0;

            return (
              <div
                key={movie.id}
                className={`p-6 rounded-lg border ${
                  overdue 
                    ? 'bg-red-900/20 border-red-700' 
                    : 'bg-app-gray-750 border-gray-600'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Movie Poster */}
                    <div className="w-16 h-24 flex-shrink-0 bg-gray-800 rounded overflow-hidden">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={`${movie.title} poster`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          No Poster
                        </div>
                      )}
                    </div>

                    {/* Movie Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {movie.title}
                        </h3>
                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-300">
                          {movie.format}
                        </Badge>
                        {overdue && (
                          <Badge variant="destructive" className="text-xs bg-red-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {daysOverdue} days overdue
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        <p className="text-white">
                          <span className="text-gray-400">Borrowed by:</span> {movie.loanedToName}
                        </p>
                        {movie.loanDate && (
                          <p className="text-gray-300">
                            <span className="text-gray-400">Loaned on:</span>{" "}
                            {new Date(movie.loanDate).toLocaleDateString()}
                          </p>
                        )}
                        {movie.expectedReturnDate && (
                          <p className={overdue ? "text-red-300 font-semibold" : "text-gray-300"}>
                            <span className="text-gray-400">Expected return:</span>{" "}
                            {new Date(movie.expectedReturnDate).toLocaleDateString()}
                          </p>
                        )}
                        {movie.loanNotes && (
                          <p className="text-gray-400 text-xs">
                            <span className="font-medium">Notes:</span> {movie.loanNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-4 lg:mt-0 lg:ml-4">
                    <Button
                      onClick={() => {
                        console.log('Loans page: Return button clicked for movie:', movie.id, movie.title);
                        returnMovieMutation.mutate(movie.id);
                      }}
                      disabled={returnMovieMutation.isPending}
                      className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {returnMovieMutation.isPending ? 'Returning...' : 'Mark as Returned'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}