import { db } from "./db";
import { movies } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { tmdbService } from "./services/tmdb";

async function updateMoviesWithTMDbIDs() {
  console.log("🎬 Starting TMDb ID and trailer update...");
  
  try {
    // Get all movies without TMDb IDs
    const moviesWithoutTMDb = await db
      .select()
      .from(movies)
      .where(isNull(movies.tmdbId));
    
    console.log(`Found ${moviesWithoutTMDb.length} movies without TMDb IDs`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const movie of moviesWithoutTMDb) {
      try {
        console.log(`\n🔍 Searching for: ${movie.title} (${movie.year})`);
        
        // Search TMDb for this movie
        const searchQuery = `${movie.title} ${movie.year || ''}`.trim();
        const searchResults = await tmdbService.searchMovies(searchQuery);
        
        console.log(`Search results for "${searchQuery}":`, searchResults?.length || 0, 'results');
        if (searchResults && searchResults.length > 0) {
          console.log(`First result: ${searchResults[0].title} (${searchResults[0].year}) - TMDb ID: ${searchResults[0].tmdbId}`);
          // Find the best match based on year and title similarity
          const bestMatch = searchResults.find(result => 
            result.year === movie.year || 
            (Math.abs((result.year || 0) - (movie.year || 0)) <= 1)
          ) || searchResults[0];
          
          // Update movie with TMDb ID and enhanced metadata
          await db
            .update(movies)
            .set({
              tmdbId: bestMatch.tmdbId,
              // Only update fields if they're missing
              description: movie.description || bestMatch.description || null,
              backdropUrl: movie.backdropUrl || bestMatch.backdropUrl || null,
              // Keep existing poster if it's custom uploaded, otherwise use TMDb
              posterUrl: movie.posterUrl?.includes('/uploads/') ? movie.posterUrl : (bestMatch.posterUrl || movie.posterUrl),
            })
            .where(eq(movies.id, movie.id));
          
          console.log(`✅ Updated ${movie.title} with TMDb ID: ${bestMatch.tmdbId}`);
          updatedCount++;
        } else {
          console.log(`❌ No TMDb match found for: ${movie.title} (${movie.year})`);
          errorCount++;
        }
        
        // Add small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        console.error(`❌ Error processing ${movie.title}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Update complete!`);
    console.log(`✅ Successfully updated: ${updatedCount} movies`);
    console.log(`❌ Errors: ${errorCount} movies`);
    
    // Test trailer functionality for a few movies
    console.log(`\n🎬 Testing trailer functionality...`);
    const updatedMovies = await db
      .select()
      .from(movies)
      .where(eq(movies.tmdbId, moviesWithoutTMDb[0]?.id))
      .limit(3);
    
    for (const movie of updatedMovies) {
      if (movie.tmdbId) {
        try {
          const videos = await tmdbService.getMovieVideos(movie.tmdbId);
          const trailer = videos.find((video: any) => 
            video.site === 'YouTube' && 
            (video.type === 'Trailer' || video.type === 'Teaser')
          );
          
          if (trailer) {
            console.log(`🎥 ${movie.title}: Found trailer - https://www.youtube.com/watch?v=${trailer.key}`);
          } else {
            console.log(`⚠️  ${movie.title}: No trailers found in TMDb`);
          }
        } catch (error) {
          console.log(`❌ ${movie.title}: Error fetching trailers - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error("💥 Fatal error:", error);
  }
}

// Run the update
updateMoviesWithTMDbIDs().then(() => {
  console.log("\n🏁 Script completed");
  process.exit(0);
}).catch(error => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});