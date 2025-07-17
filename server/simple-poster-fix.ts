import { db } from './db';
import { movies } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Use simple, guaranteed working poster URLs from reliable sources
const workingPosters = [
  // Using HTTPS URLs from reliable movie poster sources
  { title: "The Matrix", posterUrl: "https://m.media-amazon.com/images/M/MV5BNzQzOTk3OTAtNDQ0Zi00ZTVkLWI0MTEtMDllZjNkYzNjNTc4L2ltYWdlXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg" },
  { title: "Jaws", posterUrl: "https://m.media-amazon.com/images/M/MV5BMmVmODY1MzEtYTMwZC00MzNhLWFkNDMtZjAwM2EwODUxZTA5XkEyXkFqcGdeQXVyNTAyODkwOQ@@._V1_SX300.jpg" },
  { title: "The Shawshank Redemption", posterUrl: "https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg" },
  { title: "The Godfather", posterUrl: "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg" },
  { title: "Pulp Fiction", posterUrl: "https://m.media-amazon.com/images/M/MV5BNGNhMDIzZTUtNTBlZi00MTRlLWFjM2ItYzViMjE3YzI5MjljXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg" },
  { title: "The Dark Knight", posterUrl: "https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg" },
  { title: "Fight Club", posterUrl: "https://m.media-amazon.com/images/M/MV5BNDIzNDU0YzEtYzE5Ni00ZjlkLTk5ZjgtNjM3NWE4YzA3Nzk3XkEyXkFqcGdeQXVyMjUzOTY0NTY@._V1_SX300.jpg" },
  { title: "Forrest Gump", posterUrl: "https://m.media-amazon.com/images/M/MV5BNWIwODRlZTUtY2U3ZS00Yzg1LWJhNzYtMmZiYmEyNmU1NjMzXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg" },
  { title: "Inception", posterUrl: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg" },
  { title: "The Princess Bride", posterUrl: "https://m.media-amazon.com/images/M/MV5BMGM4M2Q5N2MtNThkZS00NTc1LTk1NTItNWEyZjJlMjBhZDEyXkEyXkFqcGdeQXVyMjA0MDQ0Mjc@._V1_SX300.jpg" },
  { title: "Get Out", posterUrl: "https://m.media-amazon.com/images/M/MV5BMjUxMDQwNjcyNl5BMl5BanBnXkFtZTgwNzcwMzc0MTI@._V1_SX300.jpg" },
  { title: "Back to the Future", posterUrl: "https://m.media-amazon.com/images/M/MV5BZmU0M2Y1OGUtZjIxNi00ZjBkLTg1MjgtOWIyNThiZWIwYjRiXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg" },
  { title: "E.T. the Extra-Terrestrial", posterUrl: "https://m.media-amazon.com/images/M/MV5BMTQ2ODFlMDAtNzdhOC00ZDYzLWE3YTMtNDU4ZGFmZmJmYTczXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg" },
  { title: "The Exorcist", posterUrl: "https://m.media-amazon.com/images/M/MV5BYWFlZGY2NDktY2ZjOS00ZWNkLTllYWQtM2Q4YjJlMzQ4ZDk4XkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg" },
  { title: "Casablanca", posterUrl: "https://m.media-amazon.com/images/M/MV5BY2IzZGY2YmEtYzljNS00NTM5LTgwMzUtMzM1NjQ4NGI0OTk0XkEyXkFqcGdeQXVyNDYyMDk5MTU@._V1_SX300.jpg" },
];

export async function applySimplePosterFix() {
  console.log('Applying simple poster fix with Amazon IMDb URLs...');
  
  try {
    let successCount = 0;
    
    for (const poster of workingPosters) {
      const result = await db.update(movies)
        .set({ posterUrl: poster.posterUrl })
        .where(eq(movies.title, poster.title))
        .returning();
      
      if (result.length > 0) {
        console.log(`✓ Updated: ${poster.title}`);
        successCount++;
      }
    }
    
    console.log(`Simple poster fix complete: ${successCount}/${workingPosters.length} posters updated!`);
  } catch (error) {
    console.error('Error applying simple poster fix:', error);
    throw error;
  }
}

applySimplePosterFix().catch(console.error);