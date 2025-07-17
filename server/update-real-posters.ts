import { db } from "./db";
import { movies } from "@shared/schema";
import { tmdbService } from "./services/tmdb";

export async function updateAllMoviesWithRealPosters() {
  console.log("Starting to update all movies with real TMDb posters...");
  
  // Get all movies
  const allMovies = await db.select().from(movies);
  console.log(`Found ${allMovies.length} movies to update`);
  
  let updated = 0;
  let failed = 0;
  
  for (const movie of allMovies) {
    try {
      console.log(`Searching TMDb for: ${movie.title} (${movie.year})`);
      
      // Search for the movie on TMDb
      const searchResults = await tmdbService.searchMovies(`${movie.title} ${movie.year}`);
      
      if (searchResults.length > 0) {
        const tmdbMovie = searchResults[0];
        
        if (tmdbMovie.poster_path) {
          const posterUrl = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`;
          
          // Update the movie with the real poster
          await db
            .update(movies)
            .set({ 
              posterUrl: posterUrl,
              tmdbId: tmdbMovie.id 
            })
            .where({ id: movie.id });
          
          console.log(`✓ Updated ${movie.title} with poster: ${posterUrl}`);
          updated++;
        } else {
          console.log(`⚠ No poster found for ${movie.title}`);
          failed++;
        }
      } else {
        console.log(`⚠ No TMDb match found for ${movie.title}`);
        failed++;
      }
      
      // Small delay to respect TMDb rate limits
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error(`✗ Error updating ${movie.title}:`, error);
      failed++;
    }
  }
  
  console.log(`\n=== Poster Update Complete ===`);
  console.log(`✓ Successfully updated: ${updated} movies`);
  console.log(`✗ Failed to update: ${failed} movies`);
  console.log(`Total processed: ${allMovies.length} movies`);
}

// Run the update function
updateAllMoviesWithRealPosters()
  .then(() => {
    console.log('Update complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Update failed:', err);
    process.exit(1);
  });