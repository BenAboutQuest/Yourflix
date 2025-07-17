import { Button } from "@/components/ui/button";
import { Grid3X3, List, UserX } from "lucide-react";
import type { Movie } from "@shared/schema";

interface CollectionOverviewProps {
  stats?: {
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  };
  viewMode: 'genres' | 'grid';
  onViewModeChange: (mode: 'genres' | 'grid') => void;
  loanCount: number;
  onNavigateToLoans: () => void;
}

export default function CollectionOverview({ stats, viewMode, onViewModeChange, loanCount, onNavigateToLoans }: CollectionOverviewProps) {
  return (
    <div className="px-6 py-4 border-b border-app-gray-700 bg-gradient-primary/80 backdrop-blur-sm relative overflow-hidden">
      {/* Subtle accent overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-purple-500/5"></div>
      {/* Title spanning full width */}
      <h1 className="text-2xl font-bold text-white mb-3 text-center relative z-10">
        <span className="bg-gradient-accent bg-clip-text text-transparent">Your Collection</span>
      </h1>
      
      {/* Statistics */}
      <p className="text-gray-400 text-center mb-3 relative z-10">
        {stats?.totalMovies || 0} movies • ${stats?.totalValue?.toFixed(2) || '0.00'} total value
      </p>
      
      {/* View mode buttons */}
      <div className="flex items-center justify-center gap-2 relative z-10">
        <Button
          variant={viewMode === 'genres' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('genres')}
          className={viewMode === 'genres' 
            ? 'bg-app-accent hover:bg-orange-600 text-white' 
            : 'border-gray-600 text-gray-300 hover:text-white hover:border-app-accent'
          }
        >
          <Grid3X3 className="h-4 w-4 mr-2" />
          By Genre
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className={viewMode === 'grid' 
            ? 'bg-app-accent hover:bg-orange-600 text-white' 
            : 'border-gray-600 text-gray-300 hover:text-white hover:border-app-accent'
          }
        >
          <List className="h-4 w-4 mr-2" />
          Full List
        </Button>
        {loanCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToLoans}
            className="border-gray-600 text-gray-300 hover:text-white hover:border-app-accent relative"
          >
            <UserX className="h-4 w-4 mr-2" />
            {loanCount} On Loan
          </Button>
        )}
      </div>
    </div>
  );
}