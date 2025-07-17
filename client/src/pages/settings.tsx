import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, GripVertical, Save, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MAIN_GENRES, SUB_GENRES } from "@shared/genres";
import * as XLSX from 'xlsx';

interface GenreSettings {
  id: string;
  name: string;
  enabled: boolean;
  isSubGenre: boolean;
  parentGenre?: string;
}

interface AppSettings {
  genres: GenreSettings[];
  showRecommendations: boolean;
  pureDarkMode: boolean;
}

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>({
    genres: [],
    showRecommendations: true,
    pureDarkMode: false
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('yourflixSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      
      // Apply pure dark mode if enabled
      if (parsedSettings.pureDarkMode) {
        document.body.classList.add('pure-dark-mode');
      }
    } else {
      initializeDefaultSettings();
    }
  }, []);

  const initializeDefaultSettings = () => {
    const defaultGenres: GenreSettings[] = [];
    
    // Add main genres (all enabled by default except Adult)
    MAIN_GENRES.forEach((genre) => {
      defaultGenres.push({
        id: `main_${genre.replace(/\s+/g, '_')}`,
        name: genre,
        enabled: genre !== 'Adult', // Adult genre disabled by default
        isSubGenre: false,
      });
    });

    // Add sub-genres (all disabled by default)
    Object.entries(SUB_GENRES).forEach(([parentGenre, subGenres]) => {
      subGenres.forEach((subGenre) => {
        defaultGenres.push({
          id: `sub_${parentGenre.replace(/\s+/g, '_')}_${subGenre.replace(/\s+/g, '_')}`,
          name: subGenre,
          enabled: false,
          isSubGenre: true,
          parentGenre,
        });
      });
    });

    setSettings({
      genres: defaultGenres,
      showRecommendations: true,
      pureDarkMode: false
    });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const enabledGenres = settings.genres.filter(g => g.enabled);
    const disabledGenres = settings.genres.filter(g => !g.enabled);
    
    const items = Array.from(enabledGenres);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSettings(prev => ({
      ...prev,
      genres: [...items, ...disabledGenres]
    }));
    setHasChanges(true);
  };

  const toggleGenre = (id: string) => {
    setSettings(prev => ({
      ...prev,
      genres: prev.genres.map(genre => 
        genre.id === id 
          ? { ...genre, enabled: !genre.enabled }
          : genre
      )
    }));
    setHasChanges(true);
  };

  const toggleRecommendations = () => {
    setSettings(prev => ({
      ...prev,
      showRecommendations: !prev.showRecommendations
    }));
    setHasChanges(true);
  };

  const togglePureDarkMode = () => {
    setSettings(prev => ({
      ...prev,
      pureDarkMode: !prev.pureDarkMode
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('yourflixSettings', JSON.stringify(settings));
    
    // Apply pure dark mode immediately
    if (settings.pureDarkMode) {
      document.body.classList.add('pure-dark-mode');
    } else {
      document.body.classList.remove('pure-dark-mode');
    }
    
    setHasChanges(false);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const resetToDefaults = () => {
    initializeDefaultSettings();
    setHasChanges(true);
    toast({
      title: "Reset to defaults",
      description: "Settings have been reset to default values.",
    });
  };

  const enabledGenres = settings.genres.filter(g => g.enabled);
  const disabledGenres = settings.genres.filter(g => !g.enabled);

  // Fetch movies for export
  const { data: movies = [] } = useQuery({
    queryKey: ['/api/movies'],
    queryFn: async () => {
      const response = await fetch('/api/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      return response.json();
    },
  });

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Prepare movie data for Excel export
      const exportData = movies.map((movie: any) => ({
        'Title': movie.title,
        'Year': movie.year,
        'Director': movie.director || '',
        'Format': movie.format,
        'Genres': movie.genres ? movie.genres.join(', ') : '',
        'Sub-Genres': movie.subGenres ? movie.subGenres.join(', ') : '',
        'Rating': movie.rating || '',
        'Runtime (min)': movie.runtime || '',
        'Description': movie.description || '',
        'Cast': movie.cast ? movie.cast.join(', ') : '',
        'Location': movie.location || '',
        'Condition': movie.condition || '',
        'Version/Edition': movie.version || '',
        'Catalog Number': movie.catalogId || '',
        'Barcode': movie.barcode || '',
        'Estimated Value': movie.resaleValue || '',
        'Aspect Ratio': movie.aspectRatio || '',
        'Language': movie.language || '',
        'Audio Format': movie.audioFormat || '',
        'Region/Format': movie.technicalSpecs || '',
        'Personal Rating': movie.personalRating || '',
        'Last Watched': movie.lastWatchedDate ? new Date(movie.lastWatchedDate).toLocaleDateString() : '',
        'Rotten Tomatoes Score': movie.rottenTomatoesScore || '',
        'Personal Notes': movie.notes || '',
        'Loaned': movie.isLoaned ? 'Yes' : 'No',
        'Loaned To': movie.loanedToName || '',
        'Loan Date': movie.loanDate ? new Date(movie.loanDate).toLocaleDateString() : '',
        'Expected Return': movie.expectedReturnDate ? new Date(movie.expectedReturnDate).toLocaleDateString() : '',
        'YouTube Trailer URL': movie.youtubeTrailerUrl || '',
        'Date Added': movie.createdAt ? new Date(movie.createdAt).toLocaleDateString() : '',
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Movie Collection');

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0];
      const filename = `YourFlix_Collection_${today}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Complete",
        description: `Your movie collection has been exported to ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your movie collection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-primary">
      <Header 
        onAddMovie={() => {}}
        onScanBarcode={() => {}}
        onOpenSearch={() => {}}
      />
      
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">YourFlix Settings</h1>
              <p className="text-gray-400 text-sm">
                Customize your home page layout and preferences
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Reset to Defaults
            </Button>
            {hasChanges && (
              <Button
                onClick={saveSettings}
                className="bg-app-accent hover:bg-orange-600 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* General Settings */}
        <div className="mb-8 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h2 className="text-lg font-semibold text-white mb-4">General Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium">Show Recommendations</span>
                <p className="text-gray-400 text-sm">Display recommended movies on your home page</p>
              </div>
              <Switch
                checked={settings.showRecommendations}
                onCheckedChange={toggleRecommendations}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-600">
              <div>
                <span className="text-white font-medium">Pure Dark Mode</span>
                <p className="text-gray-400 text-sm">Turn off animated backgrounds for pure black interface</p>
              </div>
              <Switch
                checked={settings.pureDarkMode}
                onCheckedChange={togglePureDarkMode}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-600">
              <div>
                <span className="text-white font-medium">Export Collection Database</span>
                <p className="text-gray-400 text-sm">Download your complete movie collection as an Excel file</p>
              </div>
              <Button
                onClick={exportToExcel}
                disabled={isExporting || movies.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : `Export ${movies.length} Movies`}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Enable Sub-Genres */}
        <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-500/30">
          <h2 className="text-lg font-semibold text-white mb-3">Popular Sub-Genres</h2>
          <p className="text-gray-300 mb-4">
            Quick-enable popular sub-genres to create specialized browsing sections on your home page
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {['Superhero', 'Romantic Comedy (Rom-Com)', 'Psychological Horror', 'Film Noir', 'Cyberpunk', 'Fairy Tale'].map((subGenre) => {
              const genre = settings.genres.find(g => g.name === subGenre);
              return (
                <Button
                  key={subGenre}
                  variant="outline"
                  size="sm"
                  onClick={() => genre && toggleGenre(genre.id)}
                  className={`text-left justify-start h-auto py-2 px-3 ${
                    genre?.enabled 
                      ? 'border-orange-500/50 bg-orange-500/10 text-orange-300' 
                      : 'border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{subGenre}</span>
                    <span className="text-xs text-gray-400">
                      {genre?.enabled ? 'Enabled' : 'Click to enable'}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enabled Genres */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Active Genres ({enabledGenres.length})
              </h2>
              <p className="text-sm text-gray-400">Drag to reorder</p>
            </div>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="enabled-genres">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 min-h-[200px] bg-gray-800/30 rounded-lg p-4"
                  >
                    {enabledGenres.map((genre, index) => (
                      <Draggable key={genre.id} draggableId={genre.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              snapshot.isDragging 
                                ? 'border-orange-400 bg-orange-900/20' 
                                : genre.isSubGenre 
                                  ? 'border-blue-500/50 bg-blue-900/20' 
                                  : 'border-gray-600 bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-gray-400" />
                              </div>
                              <div>
                                <span className="text-white font-medium">{genre.name}</span>
                                {genre.isSubGenre && (
                                  <span className="ml-2 text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded">
                                    {genre.parentGenre}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={genre.enabled}
                              onCheckedChange={() => toggleGenre(genre.id)}
                              className="data-[state=checked]:bg-orange-600"
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {enabledGenres.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No genres enabled. Enable some genres from the available list.
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Available Genres */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Available Genres ({disabledGenres.length})
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-700 rounded"></div>
                  <span className="text-gray-400">Main</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600/50 rounded"></div>
                  <span className="text-gray-400">Sub-genre</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto bg-gray-800/30 rounded-lg p-4">
              {disabledGenres.length > 0 ? (
                disabledGenres.map((genre) => (
                  <div
                    key={genre.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-gray-600/50 ${
                      genre.isSubGenre 
                        ? 'border-blue-500/30 bg-blue-900/10' 
                        : 'border-gray-600 bg-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`font-medium ${genre.isSubGenre ? 'text-blue-300' : 'text-white'}`}>
                        {genre.name}
                      </span>
                      {genre.isSubGenre && genre.parentGenre && (
                        <span className="text-xs text-gray-400">
                          Sub-genre of {genre.parentGenre}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={false}
                      onCheckedChange={() => toggleGenre(genre.id)}
                      className="data-[state=checked]:bg-orange-600"
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  All available genres are currently enabled.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Information Section */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
          <h3 className="text-white font-medium mb-3">Customizing Your Home Page:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-orange-400 font-medium mb-2">Main Genres</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Broad categories like Action, Comedy, Drama</li>
                <li>• Enabled by default for all users</li>
                <li>• Create horizontal scrollable rows on home page</li>
              </ul>
            </div>
            <div>
              <h4 className="text-blue-400 font-medium mb-2">Sub-Genres</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Specific categories like Superhero, Rom-Com, Film Noir</li>
                <li>• <span className="text-orange-300">Enable these for more personalized browsing!</span></li>
                <li>• Great for collectors with specialized interests</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-600">
            <h4 className="text-white font-medium mb-2">Tips:</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Drag active genres to reorder them on your home page</li>
              <li>• Settings are automatically saved to your browser</li>
              <li>• Use "Reset to Defaults" if you need to start over</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}