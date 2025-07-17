interface TMDbMovie {
  id: number;
  title: string;
  release_date?: string;
  runtime?: number;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
}

interface TMDbCredits {
  cast: { name: string }[];
  crew: { job: string; name: string }[];
}

interface TMDbSearchResult {
  results: TMDbMovie[];
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Genre mapping from TMDb API
const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export class TMDbService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('TMDb API key not found. Set TMDB_API_KEY environment variable.');
    }
  }

  async searchMovies(query: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('TMDb API key not configured');
    }

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status}`);
      }

      const data: TMDbSearchResult = await response.json();
      
      return data.results.map(movie => this.formatMovieData(movie));
    } catch (error) {
      console.error('TMDb search error:', error);
      throw error;
    }
  }

  async getMovieDetails(tmdbId: number): Promise<any> {
    if (!this.apiKey) {
      throw new Error('TMDb API key not configured');
    }

    try {
      const [movieResponse, creditsResponse] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${this.apiKey}`),
        fetch(`${TMDB_BASE_URL}/movie/${tmdbId}/credits?api_key=${this.apiKey}`)
      ]);

      if (!movieResponse.ok || !creditsResponse.ok) {
        throw new Error('Failed to fetch movie details from TMDb');
      }

      const movie: TMDbMovie = await movieResponse.json();
      const credits: TMDbCredits = await creditsResponse.json();

      return await this.formatMovieDetailsData(movie, credits);
    } catch (error) {
      console.error('TMDb details error:', error);
      throw error;
    }
  }

  private formatMovieData(movie: TMDbMovie) {
    return {
      tmdbId: movie.id,
      title: movie.title,
      release_date: movie.release_date,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      overview: movie.overview || '',
      description: movie.overview || '',
      poster_path: movie.poster_path,
      posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}` : null,
      genre_ids: movie.genre_ids,
      genres: movie.genre_ids ? movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean) : [],
    };
  }

  private async formatMovieDetailsData(movie: TMDbMovie, credits: TMDbCredits) {
    const director = credits.crew.find(person => person.job === 'Director')?.name;
    const cast = credits.cast.slice(0, 10).map(person => person.name);

    // Fetch YouTube trailer
    let youtubeTrailerUrl = '';
    try {
      const videos = await this.getMovieVideos(movie.id);
      const trailer = videos.find(video => 
        video.type === 'Trailer' && 
        video.site === 'YouTube' && 
        video.official === true
      ) || videos.find(video => 
        video.type === 'Trailer' && 
        video.site === 'YouTube'
      );
      
      if (trailer) {
        youtubeTrailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }
    } catch (error) {
      console.log('Could not fetch trailer for', movie.title);
    }

    return {
      tmdbId: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      runtime: movie.runtime || null,
      description: movie.overview || '',
      posterUrl: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}` : null,
      director: director || '',
      cast: cast || [],
      actors: cast || [], // Include both cast and actors for compatibility
      genres: movie.genres ? movie.genres.map(g => g.name) : ['Drama'],
      country: movie.production_countries && movie.production_countries.length > 0 ? movie.production_countries[0].name : '',
      infoPageLink: `https://www.themoviedb.org/movie/${movie.id}`, // Add TMDb info page link
      youtubeTrailerUrl: youtubeTrailerUrl, // Include YouTube trailer URL
    };
  }

  async getMovieVideos(tmdbId: number): Promise<any[]> {
    try {
      const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${this.apiKey}`);
      
      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching movie videos from TMDb:', error);
      return [];
    }
  }
}

export const tmdbService = new TMDbService();

// Export functions for use in routes
export const searchMovies = (query: string) => tmdbService.searchMovies(query);
