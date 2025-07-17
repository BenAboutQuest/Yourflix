import { db } from "./db";
import { movies } from "@shared/schema";
import { sql } from "drizzle-orm";

async function quickPosterTest() {
  const API_KEY = process.env.TMDB_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY environment variable not set');
    return;
  }
  
  // Test a few popular movies
  const testMovies = [
    { title: 'The Matrix', year: 1999 },
    { title: 'Pulp Fiction', year: 1994 },
    { title: 'The Dark Knight', year: 2008 },
    { title: 'Inception', year: 2010 },
    { title: 'Fight Club', year: 1999 }
  ];
  
  console.log('Testing TMDb API with popular movies...\n');
  
  for (const movie of testMovies) {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`
      );
      
      if (!response.ok) {
        console.log(`❌ ${movie.title}: API error ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.poster_path) {
          const posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
          console.log(`✅ ${movie.title}: Found poster - ${posterUrl}`);
          
          // Update this movie in database
          await db
            .update(movies)
            .set({ posterUrl: posterUrl, tmdbId: result.id })
            .where(sql`title = ${movie.title} AND year = ${movie.year}`);
          
        } else {
          console.log(`⚠️ ${movie.title}: Found but no poster`);
        }
      } else {
        console.log(`❌ ${movie.title}: No results found`);
      }
      
    } catch (error) {
      console.log(`❌ ${movie.title}: Error - ${error.message}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\nTest complete!');
}

quickPosterTest();