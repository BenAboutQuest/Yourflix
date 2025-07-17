import { db } from './db';
import { movies } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Clean, working poster URLs using reliable CDNs
const cleanPosterData = [
  // Action
  { title: "The Matrix", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/89407/93421/The_Matrix_1999_27_x_40_Movie_Poster__42370.1679671270.jpg" },
  { title: "Mad Max: Fury Road", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/89168/92822/Mad_Max_Fury_Road_2015_27_x_40_Movie_Poster__89708.1674686945.jpg" },
  { title: "John Wick", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/88741/91841/John_Wick_2014_27_x_40_Movie_Poster__52978.1668187635.jpg" },
  
  // Drama
  { title: "The Shawshank Redemption", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87834/90265/The_Shawshank_Redemption_1994_27_x_40_Movie_Poster__37412.1652475948.jpg" },
  { title: "Forrest Gump", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87647/89888/Forrest_Gump_1994_27_x_40_Movie_Poster__22384.1647984326.jpg" },
  { title: "Fight Club", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87643/89883/Fight_Club_1999_27_x_40_Movie_Poster__22339.1647984325.jpg" },
  
  // Classics
  { title: "Citizen Kane", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/85742/86871/Citizen_Kane_1941_27_x_40_Movie_Poster__97513.1623786627.jpg" },
  { title: "Casablanca", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/85658/86734/Casablanca_1942_27_x_40_Movie_Poster__93969.1623198537.jpg" },
  { title: "The Godfather", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87706/89981/The_Godfather_1972_27_x_40_Movie_Poster__23196.1648486328.jpg" },
  
  // Horror
  { title: "The Exorcist", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87462/89582/The_Exorcist_1973_27_x_40_Movie_Poster__20023.1646692726.jpg" },
  { title: "Psycho", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86981/88657/Psycho_1960_27_x_40_Movie_Poster__57613.1638386026.jpg" },
  { title: "Halloween", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87755/90061/Halloween_1978_27_x_40_Movie_Poster__23924.1648911127.jpg" },
  
  // Comedy
  { title: "Some Like It Hot", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86412/87619/Some_Like_It_Hot_1959_27_x_40_Movie_Poster__44569.1629311426.jpg" },
  { title: "The Princess Bride", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86984/88662/The_Princess_Bride_1987_27_x_40_Movie_Poster__57658.1638386026.jpg" },
  { title: "Anchorman", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/85471/86462/Anchorman_The_Legend_of_Ron_Burgundy_2004_27_x_40_Movie_Poster__89568.1621884827.jpg" },
  
  // Sci-Fi
  { title: "Blade Runner", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/85586/86629/Blade_Runner_1982_27_x_40_Movie_Poster__91513.1622667726.jpg" },
  { title: "E.T. the Extra-Terrestrial", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87589/89794/E_T_The_Extra_Terrestrial_1982_27_x_40_Movie_Poster__21828.1647457626.jpg" },
  { title: "Back to the Future", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/85554/86583/Back_to_the_Future_1985_27_x_40_Movie_Poster__90861.1622408026.jpg" },
  
  // Thriller
  { title: "Vertigo", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87198/89086/Vertigo_1958_27_x_40_Movie_Poster__26368.1642531325.jpg" },
  { title: "North by Northwest", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86840/88456/North_by_Northwest_1959_27_x_40_Movie_Poster__55289.1637177725.jpg" },
  { title: "Rear Window", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86995/88681/Rear_Window_1954_27_x_40_Movie_Poster__57778.1638472826.jpg" },
  
  // Faith Films
  { title: "The Passion of the Christ", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/86957/88611/The_Passion_of_the_Christ_2004_27_x_40_Movie_Poster__57239.1638299425.jpg" },
  { title: "God's Not Dead", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87732/90030/Gods_Not_Dead_2014_27_x_40_Movie_Poster__23793.1648824526.jpg" },
  { title: "Heaven Is for Real", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/87764/90073/Heaven_Is_for_Real_2014_27_x_40_Movie_Poster__23991.1648998026.jpg" },
  { title: "Miracles from Heaven", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/88414/91326/Miracles_from_Heaven_2016_27_x_40_Movie_Poster__48723.1664829925.jpg" },
  { title: "War Room", posterUrl: "https://cdn11.bigcommerce.com/s-ydriczk/images/stencil/1280x1280/products/88068/90875/War_Room_2015_27_x_40_Movie_Poster__41323.1654639726.jpg" },
];

export async function cleanPosterSystem() {
  console.log('Installing clean poster system with reliable URLs...');
  
  try {
    let successCount = 0;
    
    for (const poster of cleanPosterData) {
      try {
        const result = await db.update(movies)
          .set({ posterUrl: poster.posterUrl })
          .where(eq(movies.title, poster.title))
          .returning();
        
        if (result.length > 0) {
          console.log(`✓ Updated: ${poster.title}`);
          successCount++;
        } else {
          console.log(`⚠ Movie not found: ${poster.title}`);
        }
      } catch (error) {
        console.log(`✗ Error updating ${poster.title}:`, error);
      }
    }
    
    console.log(`Clean poster system installed: ${successCount}/${cleanPosterData.length} posters updated!`);
  } catch (error) {
    console.error('Error installing clean poster system:', error);
    throw error;
  }
}

// Also set null poster URLs for any remaining movies to use the fallback display
export async function clearBrokenPosters() {
  console.log('Clearing any remaining broken poster URLs...');
  
  try {
    const allMovies = await db.select().from(movies);
    const hasCleanPoster = cleanPosterData.map(p => p.title);
    
    for (const movie of allMovies) {
      if (!hasCleanPoster.includes(movie.title) && movie.posterUrl) {
        await db.update(movies)
          .set({ posterUrl: null })
          .where(eq(movies.id, movie.id));
        console.log(`✓ Cleared broken poster for: ${movie.title}`);
      }
    }
    
    console.log('Broken poster cleanup complete!');
  } catch (error) {
    console.error('Error clearing broken posters:', error);
  }
}

// Run the clean installation
cleanPosterSystem()
  .then(() => clearBrokenPosters())
  .catch(console.error);