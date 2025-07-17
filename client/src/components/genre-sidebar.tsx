import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Filter, X } from "lucide-react";
import { MAIN_GENRES, SUB_GENRES, getSubGenresForGenre } from "@shared/genres";

interface GenreSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  genreCounts?: Record<string, number>;
}

export default function GenreSidebar({ 
  isOpen, 
  onClose, 
  selectedGenres, 
  onGenresChange,
  genreCounts = {}
}: GenreSidebarProps) {
  const [expandedGenres, setExpandedGenres] = useState<Set<string>>(new Set());

  const toggleGenreExpansion = (genre: string) => {
    const newExpanded = new Set(expandedGenres);
    if (newExpanded.has(genre)) {
      newExpanded.delete(genre);
    } else {
      newExpanded.add(genre);
    }
    setExpandedGenres(newExpanded);
  };

  const toggleGenre = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    onGenresChange(newGenres);
  };

  const clearAllGenres = () => {
    onGenresChange([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-app-gray-850 shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-64 lg:border-l lg:border-app-gray-700
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app-gray-700">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-app-accent" />
            <h2 className="text-lg font-semibold text-white">Genres</h2>
          </div>
          <div className="flex items-center space-x-2">
            {selectedGenres.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllGenres}
                className="text-gray-400 hover:text-white text-xs"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white lg:hidden"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Selected Genres */}
        {selectedGenres.length > 0 && (
          <div className="p-4 border-b border-app-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Active Filters</h3>
            <div className="flex flex-wrap gap-2">
              {selectedGenres.map(genre => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="bg-app-accent text-white cursor-pointer hover:bg-orange-600"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Genre List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {MAIN_GENRES.filter(genre => (genreCounts[genre] || 0) > 0).map(genre => {
              const subGenres = getSubGenresForGenre(genre);
              const hasSubGenres = subGenres.length > 0;
              const isExpanded = expandedGenres.has(genre);
              const isSelected = selectedGenres.includes(genre);
              const count = genreCounts[genre] || 0;

              return (
                <div key={genre} className="space-y-1">
                  {/* Main Genre */}
                  <div className="flex items-center justify-between group">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGenre(genre)}
                      className={`
                        flex-1 justify-start text-left h-auto py-2 px-2
                        ${isSelected 
                          ? 'bg-app-accent text-white hover:bg-orange-600' 
                          : 'text-gray-300 hover:text-white hover:bg-app-gray-700'
                        }
                      `}
                    >
                      <span className="flex-1">{genre}</span>
                      {count > 0 && (
                        <span className="text-xs opacity-75 ml-2">({count})</span>
                      )}
                    </Button>
                    
                    {hasSubGenres && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGenreExpansion(genre)}
                        className="w-8 h-8 p-0 text-gray-400 hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Sub Genres */}
                  {hasSubGenres && isExpanded && (
                    <div className="ml-4 space-y-1">
                      {subGenres.filter(subGenre => (genreCounts[subGenre] || 0) > 0).map(subGenre => {
                        const isSubSelected = selectedGenres.includes(subGenre);
                        const subCount = genreCounts[subGenre] || 0;
                        
                        return (
                          <Button
                            key={subGenre}
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGenre(subGenre)}
                            className={`
                              w-full justify-start text-left h-auto py-1 px-2 text-sm
                              ${isSubSelected 
                                ? 'bg-app-accent text-white hover:bg-orange-600' 
                                : 'text-gray-400 hover:text-white hover:bg-app-gray-700'
                              }
                            `}
                          >
                            <span className="flex-1">{subGenre}</span>
                            {subCount > 0 && (
                              <span className="text-xs opacity-75 ml-2">({subCount})</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}