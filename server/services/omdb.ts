interface OMDbRating {
  Source: string;
  Value: string;
}

interface OMDbMovie {
  Title: string;
  Year: string;
  Ratings?: OMDbRating[];
  imdbRating?: string;
  Response: string;
  Error?: string;
}

export class OMDbService {
  private apiKey: string;
  private baseUrl = 'https://www.omdbapi.com/';

  constructor() {
    this.apiKey = process.env.OMDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OMDb API key not found. Rotten Tomatoes scores will not be available.');
    }
  }

  async getMovieRatings(title: string, year?: number): Promise<{ rottenTomatoesScore: number | null; imdbScore: string | null }> {
    if (!this.apiKey) {
      return { rottenTomatoesScore: null, imdbScore: null };
    }

    try {
      const params = new URLSearchParams({
        apikey: this.apiKey,
        t: title,
        ...(year && { y: year.toString() }),
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.status}`);
      }

      const data: OMDbMovie = await response.json();

      if (data.Response === 'False') {
        console.log(`OMDb: Movie not found - ${title} (${year})`);
        return { rottenTomatoesScore: null, imdbScore: null };
      }

      // Extract Rotten Tomatoes score
      let rottenTomatoesScore: number | null = null;
      if (data.Ratings) {
        const rtRating = data.Ratings.find(rating => rating.Source === 'Rotten Tomatoes');
        if (rtRating) {
          const scoreMatch = rtRating.Value.match(/(\d+)%/);
          if (scoreMatch) {
            rottenTomatoesScore = parseInt(scoreMatch[1]);
          }
        }
      }

      const imdbScore = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null;

      console.log(`OMDb: Found ratings for ${title} - RT: ${rottenTomatoesScore}%, IMDb: ${imdbScore}`);
      
      return { rottenTomatoesScore, imdbScore };
    } catch (error) {
      console.error('Error fetching OMDb ratings:', error);
      return { rottenTomatoesScore: null, imdbScore: null };
    }
  }
}

export const omdbService = new OMDbService();