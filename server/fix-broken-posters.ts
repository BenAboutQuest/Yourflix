import { db } from "./db";
import { movies } from "@shared/schema";
import { tmdbService } from "./services/tmdb";

async function fixBrokenPosters() {
  console.log("Checking for broken movie posters...");
  
  try {
    // Get all movies with poster URLs
    const allMovies = await db.select().from(movies);
    console.log(`Found ${allMovies.length} movies in database`);
    
    let fixedCount = 0;
    let checkedCount = 0;
    
    for (const movie of allMovies) {
      if (movie.posterUrl) {
        checkedCount++;
        console.log(`Checking poster for: ${movie.title} (${movie.year})`);
        
        try {
          // Check if poster URL is accessible
          const response = await fetch(movie.posterUrl, { method: 'HEAD' });
          
          if (!response.ok) {
            console.log(`❌ Broken poster for ${movie.title}: ${response.status}`);
            
            // Try to get fresh poster from TMDb
            try {
              const searchResults = await tmdbService.searchMovies(`${movie.title} ${movie.year}`);
              if (searchResults.length > 0) {
                const freshPoster = searchResults[0].posterUrl;
                if (freshPoster && freshPoster !== movie.posterUrl) {
                  // Update the database
                  await db
                    .update(movies)
                    .set({ posterUrl: freshPoster })
                    .where(movies.id.eq(movie.id));
                  
                  console.log(`✅ Fixed poster for ${movie.title}: ${freshPoster}`);
                  fixedCount++;
                } else {
                  console.log(`⚠️ No better poster found for ${movie.title}`);
                }
              } else {
                console.log(`⚠️ No TMDb results found for ${movie.title}`);
              }
            } catch (tmdbError) {
              console.log(`⚠️ TMDb search failed for ${movie.title}:`, tmdbError);
            }
          } else {
            console.log(`✅ Poster OK for ${movie.title}`);
          }
        } catch (error) {
          console.log(`❌ Failed to check poster for ${movie.title}:`, error);
        }
        
        // Small delay to avoid overwhelming the servers
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`\n🎬 Poster check complete:`);
    console.log(`- Checked: ${checkedCount} movies`);
    console.log(`- Fixed: ${fixedCount} broken posters`);
    console.log(`- Success rate: ${Math.round((checkedCount - fixedCount) / checkedCount * 100)}%`);
    
  } catch (error) {
    console.error("Error fixing posters:", error);
  }
}

// Run the poster fix if this file is executed directly
if (require.main === module) {
  fixBrokenPosters().then(() => {
    console.log("Poster fix completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Poster fix failed:", error);
    process.exit(1);
  });
}

export { fixBrokenPosters };