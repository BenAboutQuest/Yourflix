import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Grid3X3, Filter } from "lucide-react";

interface FilterBarProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  sortBy: 'title' | 'year' | 'createdAt' | 'lastWatchedDate';
  onSortByChange: (sortBy: 'title' | 'year' | 'createdAt' | 'lastWatchedDate') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onOpenGenreSidebar: () => void;
  stats?: {
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  };
}

const FORMATS = [
  'All',
  'VHS',
  'Betamax', 
  'LaserDisc',
  'CED',
  'VCD',
  'S-VHS',
  'MiniDV',
  'DVD',
  'HD DVD',
  'Blu-ray',
  '4K Ultra HD Blu-ray'
];
export default function FilterBar({
  selectedFormat,
  onFormatChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onOpenGenreSidebar,
  stats,
}: FilterBarProps) {
  const toggleFormat = (format: string) => {
    if (format === 'All') {
      onFormatChange('');
    } else {
      onFormatChange(selectedFormat === format ? '' : format);
    }
  };



  const formatCount = selectedFormat && stats ? stats.formatCounts[selectedFormat] || 0 : null;

  return (
    <>
      {/* Filter Bar */}
      <div className="bg-app-gray-850 border-b border-app-gray-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Genres and Sort */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Genre Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenGenreSidebar}
              className="flex items-center space-x-2 border-gray-600 text-gray-300 hover:text-white hover:border-app-accent flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
              <span>Genres</span>
            </Button>

            {/* Sort Options */}
            <div className="flex items-center space-x-2 ml-auto">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-');
                onSortByChange(newSortBy as 'title' | 'year' | 'createdAt' | 'lastWatchedDate');
                onSortOrderChange(newSortOrder as 'asc' | 'desc');
              }}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Recently Added</SelectItem>
                  <SelectItem value="lastWatchedDate-desc">Recently Watched</SelectItem>
                  <SelectItem value="lastWatchedDate-asc">Long Time Unwatched</SelectItem>
                  <SelectItem value="title-asc">Title A-Z</SelectItem>
                  <SelectItem value="title-desc">Title Z-A</SelectItem>
                  <SelectItem value="year-desc">Release Year (Newest)</SelectItem>
                  <SelectItem value="year-asc">Release Year (Oldest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-app-gray-850/50 border-b border-app-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-6">
              <span>
                {stats ? `${stats.totalMovies} movies in collection` : 'Loading...'}
              </span>
              {formatCount && (
                <span>{formatCount} {selectedFormat} titles</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {stats && (
                <span>Est. Value: ${stats.totalValue.toFixed(2)}</span>
              )}
              <Button variant="ghost" size="icon" className="text-app-accent hover:text-orange-400">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
