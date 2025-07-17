import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FormatFilterBarProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  stats?: {
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  };
}

const FORMATS = [
  'VHS', 'Betamax', 'LaserDisc', 'CED', 'VCD', 'S-VHS', 'MiniDV', 
  'DVD', 'HD DVD', 'Blu-ray', '4K Ultra HD Blu-ray'
];

export default function FormatFilterBar({ selectedFormat, onFormatChange, stats }: FormatFilterBarProps) {
  const formatCounts = stats?.formatCounts || {};
  
  // Get formats that have movies, sorted by count
  const availableFormats = FORMATS.filter(format => formatCounts[format] > 0)
    .sort((a, b) => formatCounts[b] - formatCounts[a]);

  return (
    <div className="px-6 py-4 border-b border-app-gray-700 bg-app-gray-850">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
        <span className="text-sm text-gray-400 whitespace-nowrap">Format:</span>
        
        <Button
          variant={selectedFormat === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFormatChange('')}
          className={selectedFormat === '' 
            ? 'bg-app-accent hover:bg-orange-600 text-white whitespace-nowrap' 
            : 'border-gray-600 text-gray-300 hover:text-white hover:border-app-accent whitespace-nowrap'
          }
        >
          All
          <Badge variant="secondary" className="ml-2 bg-gray-600 text-gray-200">
            {stats?.totalMovies || 0}
          </Badge>
        </Button>

        {availableFormats.map((format) => (
          <Button
            key={format}
            variant={selectedFormat === format ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFormatChange(format)}
            className={selectedFormat === format 
              ? 'bg-app-accent hover:bg-orange-600 text-white whitespace-nowrap' 
              : 'border-gray-600 text-gray-300 hover:text-white hover:border-app-accent whitespace-nowrap'
            }
          >
            {format}
            <Badge variant="secondary" className="ml-2 bg-gray-600 text-gray-200">
              {formatCounts[format]}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
}