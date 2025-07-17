import { db } from "./db";
import { movies } from "@shared/schema";
import { sql } from "drizzle-orm";

async function batchUpdatePosters() {
  const API_KEY = process.env.TMDB_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY environment variable not set');
    return;
  }
  
  // Get all movies from database
  const allMovies = await db.select().from(movies);
  console.log(`Updating posters for ${allMovies.length} movies...\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const movie of allMovies) {
    try {
      // Simple search first
      let response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movie.title)}`
      );
      
      if (!response.ok) {
        console.log(`❌ ${movie.title}: API error ${response.status}`);
        failed++;
        continue;
      }
      
      let data = await response.json();
      
      // If no results, try with year
      if (!data.results || data.results.length === 0) {
        response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`
        );
        
        if (response.ok) {
          data = await response.json();
        }
      }
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.poster_path) {
          const posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
          
          // Update the movie
          await db
            .update(movies)
            .set({ posterUrl: posterUrl, tmdbId: result.id })
            .where(sql`id = ${movie.id}`);
          
          console.log(`✅ ${movie.title}: Updated with poster`);
          updated++;
        } else {
          console.log(`⚠️ ${movie.title}: Found but no poster`);
          failed++;
        }
      } else {
        console.log(`❌ ${movie.title}: No results found`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${movie.title}: Error - ${error.message}`);
      failed++;
    }
    
    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  
  console.log(`\n=== Poster Update Complete ===`);
  console.log(`✅ Successfully updated: ${updated} movies`);
  console.log(`❌ Failed to update: ${failed} movies`);
  console.log(`Total processed: ${allMovies.length} movies`);
}

batchUpdatePosters();