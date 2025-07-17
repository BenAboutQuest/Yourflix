import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Movie } from "@shared/schema";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMovieSelect?: (movie: Movie) => void;
}

export default function SearchModal({ isOpen, onClose, searchQuery, onSearchChange, onMovieSelect }: SearchModalProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeTab, setActiveTab] = useState("title");

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Catalog search query
  const { data: catalogResults, isLoading: catalogLoading } = useQuery({
    queryKey: ['/api/search/catalog', catalogQuery],
    queryFn: () => apiRequest(`/api/search/catalog?q=${encodeURIComponent(catalogQuery)}`),
    enabled: catalogQuery.length > 2,
  });

  const handleSearch = () => {
    onSearchChange(localQuery);
    onClose();
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === "title") {
        handleSearch();
      }
    }
  };

  const handleMovieClick = (movie: Movie) => {
    if (onMovieSelect) {
      onMovieSelect(movie);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-gray-800 border-app-gray-600 text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">Search Movies</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          <TabsList className="grid w-full grid-cols-2 bg-app-gray-750">
            <TabsTrigger value="title" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-app-accent">
              <Search className="h-4 w-4 mr-2" />
              Search by Title
            </TabsTrigger>
            <TabsTrigger value="catalog" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-app-accent">
              <Hash className="h-4 w-4 mr-2" />
              Catalog Number
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="title" className="space-y-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search your collection..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 bg-app-gray-750 border-gray-600 text-white placeholder-gray-400 focus:border-app-accent"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleSearch}
                className="flex-1 bg-app-accent hover:bg-orange-600 text-white"
              >
                Search
              </Button>
              <Button 
                onClick={handleClear}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:text-white hover:border-app-accent"
              >
                Clear
              </Button>
              <Button 
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {searchQuery && (
              <div className="text-sm text-gray-400">
                Currently searching for: "{searchQuery}"
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="catalog" className="space-y-4 flex-1 flex flex-col">
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter catalog number (e.g., PILF-1234, WBV1123)"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                className="pl-10 bg-app-gray-750 border-gray-600 text-white placeholder-gray-400 focus:border-app-accent"
                autoFocus={activeTab === "catalog"}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {catalogLoading && catalogQuery.length > 2 && (
                <div className="text-center text-gray-400 py-4">Searching...</div>
              )}
              
              {catalogResults && catalogResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Found {catalogResults.length} result(s):</h4>
                  {catalogResults.map((movie: Movie) => (
                    <div 
                      key={movie.id}
                      onClick={() => handleMovieClick(movie)}
                      className="p-3 bg-app-gray-750 rounded cursor-pointer hover:bg-app-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {movie.posterUrl && (
                          <img 
                            src={movie.posterUrl} 
                            alt={movie.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h5 className="font-medium text-white">{movie.title}</h5>
                          <div className="text-sm text-gray-400">
                            {movie.year} • {movie.format}
                            {movie.edition && ` • ${movie.edition}`}
                          </div>
                          {movie.catalogId && (
                            <div className="text-xs text-app-accent">
                              Catalog: {movie.catalogId}
                            </div>
                          )}
                          {movie.condition && (
                            <div className="text-xs text-gray-500">
                              Condition: {"★".repeat(movie.condition)}{"☆".repeat(5 - movie.condition)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {catalogResults && catalogResults.length === 0 && catalogQuery.length > 2 && !catalogLoading && (
                <div className="text-center text-gray-400 py-4">
                  <div className="mb-2">No items found with that catalog number.</div>
                  <div className="text-sm">Please check for typos or try searching by title.</div>
                </div>
              )}
              
              {catalogQuery.length <= 2 && (
                <div className="text-center text-gray-500 py-4 text-sm">
                  Enter at least 3 characters to search
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}