import { db } from "./db";
import { movies } from "@shared/schema";
import { eq } from "drizzle-orm";

async function manualTMDbUpdate() {
  console.log("🎬 Manual TMDb ID update for key movies...");
  
  const movieUpdates = [
    { title: "Jurassic Park", year: 1993, tmdbId: 329 },
    { title: "Spawn", year: 1997, tmdbId: 1271 },
    { title: "The Matrix", year: 1999, tmdbId: 603 },
    { title: "Titanic", year: 1997, tmdbId: 597 },
    { title: "Star Wars", year: 1977, tmdbId: 11 },
  ];
  
  let updateCount = 0;
  
  for (const update of movieUpdates) {
    try {
      // Find movies with this title and year
      const matchingMovies = await db
        .select()
        .from(movies)
        .where(eq(movies.title, update.title));
      
      const exactMatch = matchingMovies.find(m => m.year === update.year);
      
      if (exactMatch) {
        await db
          .update(movies)
          .set({ tmdbId: update.tmdbId })
          .where(eq(movies.id, exactMatch.id));
        
        console.log(`✅ Updated ${update.title} (${update.year}) with TMDb ID: ${update.tmdbId}`);
        updateCount++;
      } else {
        console.log(`⚠️  No exact match found for ${update.title} (${update.year})`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${update.title}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Updated ${updateCount} movies with TMDb IDs`);
  
  // Test trailer for Jurassic Park
  const jurassicPark = await db
    .select()
    .from(movies)
    .where(eq(movies.title, "Jurassic Park"))
    .limit(1);
  
  if (jurassicPark.length > 0 && jurassicPark[0].tmdbId) {
    console.log(`\n🎥 Testing trailer for Jurassic Park (TMDb ID: ${jurassicPark[0].tmdbId})`);
    // The trailer will be fetched when the user opens the movie detail modal
  }
}

manualTMDbUpdate().then(() => {
  console.log("\n✅ Manual update complete");
  process.exit(0);
}).catch(error => {
  console.error("💥 Manual update failed:", error);
  process.exit(1);
});