import { db } from "./db";
import { movies } from "@shared/schema";
import { sql } from "drizzle-orm";

async function continuePosterUpdate() {
  const API_KEY = process.env.TMDB_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY environment variable not set');
    return;
  }
  
  // Get movies without posters
  const missingPosters = await db
    .select()
    .from(movies)
    .where(sql`poster_url IS NULL`)
    .limit(20); // Process in smaller batches
  
  console.log(`Found ${missingPosters.length} movies without posters. Processing...`);
  
  let updated = 0;
  let failed = 0;
  
  for (const movie of missingPosters) {
    try {
      console.log(`Searching for: ${movie.title} (${movie.year})`);
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(movie.title)}&year=${movie.year}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          if (result.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
            
            await db
              .update(movies)
              .set({ posterUrl: posterUrl, tmdbId: result.id })
              .where(sql`id = ${movie.id}`);
            
            console.log(`✅ ${movie.title}: Updated`);
            updated++;
          } else {
            console.log(`⚠️ ${movie.title}: No poster available`);
            failed++;
          }
        } else {
          console.log(`❌ ${movie.title}: Not found`);
          failed++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ ${movie.title}: Error`);
      failed++;
    }
  }
  
  console.log(`\n✅ Updated: ${updated}, ❌ Failed: ${failed}`);
  
  // Check remaining
  const remaining = await db.select({ count: sql`count(*)` }).from(movies).where(sql`poster_url IS NULL`);
  console.log(`Remaining movies without posters: ${remaining[0].count}`);
}

continuePosterUpdate();