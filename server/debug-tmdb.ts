import { tmdbService } from "./services/tmdb";

async function debugTMDbAPI() {
  try {
    console.log("🔍 Testing TMDb API directly...");
    
    // Test a simple search
    console.log("\n1. Testing direct search for 'Jurassic Park':");
    const jurassicResults = await tmdbService.searchMovies("Jurassic Park");
    console.log("Results:", JSON.stringify(jurassicResults, null, 2));
    
    console.log("\n2. Testing search for 'Spawn 1997':");
    const spawnResults = await tmdbService.searchMovies("Spawn 1997");
    console.log("Results:", JSON.stringify(spawnResults, null, 2));
    
    // Test videos API if we found something
    if (jurassicResults.length > 0) {
      const tmdbId = jurassicResults[0].tmdbId;
      console.log(`\n3. Testing videos for Jurassic Park (TMDb ID: ${tmdbId}):`);
      const videos = await tmdbService.getMovieVideos(tmdbId);
      console.log("Videos:", JSON.stringify(videos, null, 2));
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

debugTMDbAPI().then(() => {
  console.log("\n✅ Debug complete");
  process.exit(0);
}).catch(error => {
  console.error("💥 Debug failed:", error);
  process.exit(1);
});