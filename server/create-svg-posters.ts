import { db } from './db';
import { movies } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Create simple SVG poster placeholders as data URLs
function createSVGPoster(title: string, year: number, genre: string): string {
  const colors = {
    'Action': '#DC2626',
    'Drama': '#2563EB', 
    'Comedy': '#F59E0B',
    'Horror': '#7C2D12',
    'Sci-Fi': '#059669',
    'Thriller': '#7C3AED',
    'Western': '#B45309',
    'Animation': '#EC4899',
    'Romance': '#BE185D',
    'Crime': '#374151',
    'Historical': '#92400E',
    'Faith Films': '#1D4ED8'
  };
  
  const color = colors[genre] || '#6B7280';
  
  const svg = `
    <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="450" fill="${color}" opacity="0.9"/>
      <rect x="10" y="10" width="280" height="430" fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
      <text x="150" y="200" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
        <tspan x="150" dy="0">${title.length > 20 ? title.substring(0, 20) + '...' : title}</tspan>
        <tspan x="150" dy="40">(${year})</tspan>
      </text>
      <text x="150" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" opacity="0.8">
        ${genre}
      </text>
      <circle cx="50" cy="50" r="20" fill="white" opacity="0.3"/>
      <circle cx="250" cy="400" r="15" fill="white" opacity="0.3"/>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function createSVGPosters() {
  console.log('Creating SVG poster placeholders for all movies...');
  
  try {
    const allMovies = await db.select().from(movies);
    let updateCount = 0;
    
    for (const movie of allMovies) {
      const primaryGenre = movie.genres && movie.genres.length > 0 ? movie.genres[0] : 'Drama';
      const svgPoster = createSVGPoster(movie.title, movie.year, primaryGenre);
      
      await db.update(movies)
        .set({ posterUrl: svgPoster })
        .where(eq(movies.id, movie.id));
      
      console.log(`✓ Created SVG poster for: ${movie.title}`);
      updateCount++;
    }
    
    console.log(`SVG poster creation complete: ${updateCount} posters created!`);
  } catch (error) {
    console.error('Error creating SVG posters:', error);
    throw error;
  }
}

createSVGPosters().catch(console.error);