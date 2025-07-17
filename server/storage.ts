import { movies, type Movie, type InsertMovie, type UpdateMovie } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt } from "drizzle-orm";

export interface IStorage {
  // Movie operations
  getMovies(userId: number, filters?: {
    format?: string;
    genres?: string[];
    subGenres?: string[];
    search?: string;
    catalogSearch?: string;
    cast?: string;
    director?: string;
    writer?: string;
    sortBy?: 'title' | 'year' | 'createdAt' | 'lastWatchedDate';
    sortOrder?: 'asc' | 'desc';
    groupVersions?: boolean;
  }): Promise<Movie[]>;
  searchByCatalogNumber(userId: number, catalogNumber: string): Promise<Movie[]>;
  getMovie(userId: number, id: number): Promise<Movie | undefined>;
  getMovieByBarcode(userId: number, barcode: string): Promise<Movie | undefined>;
  getMovieByCatalogId(userId: number, catalogId: string): Promise<Movie | undefined>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  updateMovie(userId: number, id: number, updates: UpdateMovie): Promise<Movie | undefined>;
  markAsWatched(userId: number, id: number): Promise<Movie | undefined>;
  // Loan tracking operations
  loanMovie(userId: number, id: number, loanData: {
    loanedToName: string;
    expectedReturnDate: Date;
    loanNotes?: string;
  }): Promise<Movie | undefined>;
  returnMovie(userId: number, id: number): Promise<Movie | undefined>;
  getLoanedMovies(userId: number): Promise<Movie[]>;
  getOverdueLoans(userId: number): Promise<Movie[]>;
  getRecommendedMovie(userId: number): Promise<Movie | null>;
  getThreeRecommendedMovies(userId: number): Promise<Movie[]>;
  deleteMovie(userId: number, id: number): Promise<boolean>;
  getCollectionStats(userId: number): Promise<{
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  }>;
}

export class DatabaseStorage implements IStorage {
  async searchByCatalogNumber(userId: number, catalogNumber: string): Promise<Movie[]> {
    const allMovies = await db.select().from(movies).where(eq(movies.userId, userId));
    const searchTerm = catalogNumber.toLowerCase().replace(/[-\s]/g, '');
    
    return allMovies.filter(movie => {
      // Search in catalogId
      if (movie.catalogId) {
        const catalog = movie.catalogId.toLowerCase().replace(/[-\s]/g, '');
        if (catalog.includes(searchTerm)) return true;
      }
      
      // Search in barcode as secondary option
      if (movie.barcode) {
        const barcode = movie.barcode.toLowerCase().replace(/[-\s]/g, '');
        if (barcode.includes(searchTerm)) return true;
      }
      
      return false;
    });
  }

  async getMovies(userId: number, filters?: {
    format?: string;
    genres?: string[];
    subGenres?: string[];
    search?: string;
    catalogSearch?: string;
    cast?: string;
    director?: string;
    writer?: string;
    sortBy?: 'title' | 'year' | 'createdAt' | 'lastWatchedDate';
    sortOrder?: 'asc' | 'desc';
    groupVersions?: boolean;
  }): Promise<Movie[]> {
    let query = db.select().from(movies).where(eq(movies.userId, userId));
    
    // Note: For this implementation, we'll get all movies and filter in JavaScript
    // In a production app, you'd want to use SQL WHERE clauses for better performance
    const allMovies = await query;
    let filteredMovies = allMovies;

    if (filters) {
      if (filters.format) {
        filteredMovies = filteredMovies.filter(movie => movie.format === filters.format);
      }

      if (filters.genres && filters.genres.length > 0) {
        filteredMovies = filteredMovies.filter(movie => 
          movie.genres && filters.genres!.some(genre => movie.genres!.includes(genre))
        );
      }

      if (filters.subGenres && filters.subGenres.length > 0) {
        filteredMovies = filteredMovies.filter(movie => 
          movie.subGenres && filters.subGenres!.some(subGenre => movie.subGenres!.includes(subGenre))
        );
      }

      if (filters.cast) {
        const castLower = filters.cast.toLowerCase();
        filteredMovies = filteredMovies.filter(movie =>
          movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(castLower))
        );
      }

      if (filters.director) {
        const directorLower = filters.director.toLowerCase();
        filteredMovies = filteredMovies.filter(movie =>
          movie.director && movie.director.toLowerCase().includes(directorLower)
        );
      }

      if (filters.writer) {
        const writerLower = filters.writer.toLowerCase();
        filteredMovies = filteredMovies.filter(movie =>
          movie.writers && movie.writers.some(writer => writer.toLowerCase().includes(writerLower))
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredMovies = filteredMovies.filter(movie =>
          movie.title.toLowerCase().includes(searchLower) ||
          (movie.director && movie.director.toLowerCase().includes(searchLower)) ||
          (movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(searchLower))) ||
          (movie.writers && movie.writers.some(writer => writer.toLowerCase().includes(searchLower)))
        );
      }

      if (filters.catalogSearch) {
        const catalogResults = await this.searchByCatalogNumber(userId, filters.catalogSearch);
        const catalogIds = catalogResults.map(movie => movie.id);
        filteredMovies = filteredMovies.filter(movie => catalogIds.includes(movie.id));
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      filteredMovies.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return filteredMovies;
  }

  async getMovie(userId: number, id: number): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(and(eq(movies.id, id), eq(movies.userId, userId)));
    return movie || undefined;
  }

  async getMovieByBarcode(userId: number, barcode: string): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(and(eq(movies.barcode, barcode), eq(movies.userId, userId)));
    return movie || undefined;
  }

  async getMovieByCatalogId(userId: number, catalogId: string): Promise<Movie | undefined> {
    const [movie] = await db.select().from(movies).where(and(eq(movies.catalogId, catalogId), eq(movies.userId, userId)));
    return movie || undefined;
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const [movie] = await db
      .insert(movies)
      .values(insertMovie)
      .returning();
    return movie;
  }

  async updateMovie(userId: number, id: number, updates: UpdateMovie): Promise<Movie | undefined> {
    const [movie] = await db
      .update(movies)
      .set(updates)
      .where(and(eq(movies.id, id), eq(movies.userId, userId)))
      .returning();
    return movie || undefined;
  }

  async markAsWatched(userId: number, id: number): Promise<Movie | undefined> {
    const [movie] = await db
      .update(movies)
      .set({ lastWatchedDate: new Date() })
      .where(and(eq(movies.id, id), eq(movies.userId, userId)))
      .returning();
    return movie || undefined;
  }

  async loanMovie(userId: number, id: number, loanData: {
    loanedToName: string;
    expectedReturnDate: Date;
    loanNotes?: string;
  }): Promise<Movie | undefined> {
    const [movie] = await db
      .update(movies)
      .set({
        isLoaned: true,
        loanedToName: loanData.loanedToName,
        loanDate: new Date(),
        expectedReturnDate: loanData.expectedReturnDate,
        loanNotes: loanData.loanNotes,
        actualReturnDate: null,
      })
      .where(and(eq(movies.id, id), eq(movies.userId, userId)))
      .returning();
    return movie || undefined;
  }

  async returnMovie(userId: number, id: number): Promise<Movie | undefined> {
    const [movie] = await db
      .update(movies)
      .set({
        isLoaned: false,
        actualReturnDate: new Date(),
      })
      .where(and(eq(movies.id, id), eq(movies.userId, userId)))
      .returning();
    return movie || undefined;
  }

  async getLoanedMovies(userId: number): Promise<Movie[]> {
    return await db
      .select()
      .from(movies)
      .where(and(eq(movies.userId, userId), eq(movies.isLoaned, true)));
  }

  async getOverdueLoans(userId: number): Promise<Movie[]> {
    const now = new Date();
    return await db
      .select()
      .from(movies)
      .where(and(
        eq(movies.userId, userId), 
        eq(movies.isLoaned, true),
        lt(movies.expectedReturnDate, now)
      ));
  }

  async getRecommendedMovie(userId: number): Promise<Movie | null> {
    const allMovies = await db.select().from(movies).where(eq(movies.userId, userId));
    
    if (allMovies.length === 0) return null;
    
    // Get highly rated movies (4+ stars) to understand preferences
    const highlyRatedMovies = allMovies.filter(movie => movie.personalRating && movie.personalRating >= 4);
    
    // Filter movies that haven't been watched or haven't been watched in a while
    const unwatchedMovies = allMovies.filter(movie => !movie.lastWatchedDate);
    const oldWatchedMovies = allMovies.filter(movie => {
      if (!movie.lastWatchedDate) return false;
      const daysSinceWatched = (Date.now() - movie.lastWatchedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceWatched > 90; // Haven't watched in 3+ months
    });
    
    const candidateMovies = [...unwatchedMovies, ...oldWatchedMovies];
    
    if (candidateMovies.length === 0) return null;
    
    // If we have rating data, use it to find similar movies
    if (highlyRatedMovies.length > 0) {
      // Get preferred genres from highly rated movies
      const preferredGenres = new Set<string>();
      const preferredDirectors = new Set<string>();
      const preferredFormats = new Set<string>();
      
      highlyRatedMovies.forEach(movie => {
        if (movie.genres) {
          movie.genres.forEach(genre => preferredGenres.add(genre));
        }
        if (movie.director) {
          preferredDirectors.add(movie.director);
        }
        preferredFormats.add(movie.format);
      });
      
      // Score candidate movies based on similarity to preferences
      const scoredCandidates = candidateMovies.map(movie => {
        let score = 0;
        
        // Genre matching (highest weight)
        if (movie.genres) {
          const genreMatches = movie.genres.filter(genre => preferredGenres.has(genre)).length;
          score += genreMatches * 3;
        }
        
        // Director matching
        if (movie.director && preferredDirectors.has(movie.director)) {
          score += 2;
        }
        
        // Format matching (lower weight)
        if (preferredFormats.has(movie.format)) {
          score += 1;
        }
        
        // Boost unwatched movies
        if (!movie.lastWatchedDate) {
          score += 2;
        }
        
        return { movie, score };
      });
      
      // Sort by score and return top candidate with some randomness
      scoredCandidates.sort((a, b) => b.score - a.score);
      
      // Take top 3 and randomly select to add variety
      const topCandidates = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
      const randomIndex = Math.floor(Math.random() * topCandidates.length);
      return topCandidates[randomIndex].movie;
    }
    
    // Fallback: return a random candidate
    const randomIndex = Math.floor(Math.random() * candidateMovies.length);
    return candidateMovies[randomIndex];
  }

  async getThreeRecommendedMovies(userId: number): Promise<Movie[]> {
    const allMovies = await db.select().from(movies).where(eq(movies.userId, userId));
    
    if (allMovies.length === 0) return [];
    
    // Filter movies that haven't been watched or haven't been watched in a while
    const unwatchedMovies = allMovies.filter(movie => !movie.lastWatchedDate);
    const oldWatchedMovies = allMovies.filter(movie => {
      if (!movie.lastWatchedDate) return false;
      const daysSinceWatched = (Date.now() - movie.lastWatchedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceWatched > 90; // Haven't watched in 3+ months
    });
    
    const candidateMovies = [...unwatchedMovies, ...oldWatchedMovies];
    
    if (candidateMovies.length === 0) return [];
    
    // Shuffle candidates and take up to 3
    const shuffled = candidateMovies.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  async deleteMovie(userId: number, id: number): Promise<boolean> {
    const result = await db.delete(movies).where(and(eq(movies.id, id), eq(movies.userId, userId)));
    return result.rowCount > 0;
  }

  async getCollectionStats(userId: number): Promise<{
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  }> {
    const allMovies = await db.select().from(movies).where(eq(movies.userId, userId));
    
    const formatCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};
    let totalValue = 0;

    allMovies.forEach(movie => {
      // Count formats
      formatCounts[movie.format] = (formatCounts[movie.format] || 0) + 1;
      
      // Count genres
      if (movie.genres) {
        movie.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
      
      // Sum values - use estimatedValue field from database
      if (movie.estimatedValue) {
        totalValue += movie.estimatedValue;
      }
    });

    return {
      totalMovies: allMovies.length,
      totalValue,
      formatCounts,
      genreCounts,
    };
  }
}

export class MemStorage implements IStorage {
  private movies: Map<number, Movie>;
  private currentId: number;

  constructor() {
    this.movies = new Map();
    this.currentId = 1;
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add some sample movies to demonstrate the new features
    const sampleMovies = [
      {
        title: "The Matrix",
        year: 1999,
        format: "DVD",
        description: "A computer programmer discovers reality is actually a simulation.",
        director: "The Wachowskis",
        cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        genres: ["Action", "Science Fiction"],
        condition: 4,
        location: "Shelf A, Row 3",
        resaleValue: 8.99,
        posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
      },
      {
        title: "Blade Runner",
        year: 1982,
        format: "LaserDisc",
        description: "A blade runner must pursue and terminate four replicants.",
        director: "Ridley Scott",
        cast: ["Harrison Ford", "Rutger Hauer", "Sean Young"],
        genres: ["Science Fiction", "Thriller"],
        condition: 5,
        location: "Display Case",
        resaleValue: 45.00,
        catalogId: "LD-13456",
        posterUrl: "https://image.tmdb.org/t/p/w500/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg"
      },
      {
        title: "Back to the Future",
        year: 1985,
        format: "VHS",
        description: "A teenager travels back in time in a DeLorean time machine.",
        director: "Robert Zemeckis",
        cast: ["Michael J. Fox", "Christopher Lloyd", "Lea Thompson"],
        genres: ["Adventure", "Comedy", "Science Fiction"],
        condition: 3,
        location: "VHS Cabinet",
        resaleValue: 12.50,
        loanedTo: "Sarah",
        loanedDate: new Date("2024-12-01"),
        posterUrl: "https://image.tmdb.org/t/p/w500/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg"
      },
      {
        title: "Akira",
        year: 1988,
        format: "Betamax",
        description: "A secret military project endangers Neo-Tokyo.",
        director: "Katsuhiro Otomo",
        cast: ["Mitsuo Iwata", "Nozomu Sasaki", "Mami Koyama"],
        genres: ["Animation", "Action", "Science Fiction"],
        condition: 4,
        location: "Rare Collection Box",
        resaleValue: 125.00,
        posterUrl: "https://image.tmdb.org/t/p/w500/gQB8Y5RCMkv2zwzFHbUJX3kAhvA.jpg"
      },
      {
        title: "The Avengers",
        year: 2012,
        format: "4K Ultra HD Blu-ray",
        description: "Earth's mightiest heroes assemble to save the world.",
        director: "Joss Whedon",
        cast: ["Robert Downey Jr.", "Chris Evans", "Mark Ruffalo"],
        genres: ["Action", "Adventure"],
        condition: 5,
        location: "New Releases Shelf",
        resaleValue: 24.99,
        barcode: "786936850239",
        posterUrl: "https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg"
      }
    ];

    sampleMovies.forEach(movieData => {
      const id = this.currentId++;
      const movie: Movie = {
        ...movieData,
        id,
        createdAt: new Date(),
        // Ensure all fields have proper values
        description: movieData.description || null,
        location: movieData.location || null,
        barcode: movieData.barcode || null,
        catalogId: movieData.catalogId || null,
        posterUrl: movieData.posterUrl || null,
        backdropUrl: null,
        director: movieData.director || null,
        cast: movieData.cast || null,
        genres: movieData.genres || null,
        year: movieData.year || null,
        runtime: null,
        rating: null,
        resaleValue: movieData.resaleValue || null,
        condition: movieData.condition || null,
        loanedTo: movieData.loanedTo || null,
        loanedDate: movieData.loanedDate || null,
        lastWatchedDate: movieData.lastWatchedDate || null,
        subGenres: movieData.subGenres || [],
        writers: movieData.writers || [],
        tags: movieData.tags || [],
        tmdbId: null,
      };
      this.movies.set(id, movie);
    });
  }

  async getMovies(filters?: {
    format?: string;
    genres?: string[];
    subGenres?: string[];
    search?: string;
    cast?: string;
    director?: string;
    writer?: string;
    sortBy?: 'title' | 'year' | 'createdAt' | 'lastWatchedDate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Movie[]> {
    let moviesArray = Array.from(this.movies.values());

    // Apply filters
    if (filters) {
      if (filters.format) {
        moviesArray = moviesArray.filter(movie => movie.format === filters.format);
      }

      if (filters.genres && filters.genres.length > 0) {
        moviesArray = moviesArray.filter(movie => 
          movie.genres && filters.genres!.some(genre => movie.genres!.includes(genre))
        );
      }

      if (filters.subGenres && filters.subGenres.length > 0) {
        moviesArray = moviesArray.filter(movie => 
          movie.subGenres && filters.subGenres!.some(subGenre => movie.subGenres!.includes(subGenre))
        );
      }

      if (filters.cast) {
        const castLower = filters.cast.toLowerCase();
        moviesArray = moviesArray.filter(movie =>
          movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(castLower))
        );
      }

      if (filters.director) {
        const directorLower = filters.director.toLowerCase();
        moviesArray = moviesArray.filter(movie =>
          movie.director && movie.director.toLowerCase().includes(directorLower)
        );
      }

      if (filters.writer) {
        const writerLower = filters.writer.toLowerCase();
        moviesArray = moviesArray.filter(movie =>
          movie.writers && movie.writers.some(writer => writer.toLowerCase().includes(writerLower))
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        moviesArray = moviesArray.filter(movie =>
          movie.title.toLowerCase().includes(searchLower) ||
          (movie.director && movie.director.toLowerCase().includes(searchLower)) ||
          (movie.cast && movie.cast.some(actor => actor.toLowerCase().includes(searchLower))) ||
          (movie.writers && movie.writers.some(writer => writer.toLowerCase().includes(searchLower)))
        );
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      moviesArray.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
    }

    return moviesArray;
  }

  async getMovie(id: number): Promise<Movie | undefined> {
    return this.movies.get(id);
  }

  async getMovieByBarcode(barcode: string): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find(movie => movie.barcode === barcode);
  }

  async getMovieByCatalogId(catalogId: string): Promise<Movie | undefined> {
    return Array.from(this.movies.values()).find(movie => movie.catalogId === catalogId);
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const id = this.currentId++;
    const movie: Movie = {
      ...insertMovie,
      id,
      createdAt: new Date(),
      // Ensure all required fields have proper values
      description: insertMovie.description || null,
      location: insertMovie.location || null,
      barcode: insertMovie.barcode || null,
      catalogId: insertMovie.catalogId || null,
      posterUrl: insertMovie.posterUrl || null,
      backdropUrl: insertMovie.backdropUrl || null,
      director: insertMovie.director || null,
      cast: insertMovie.cast || null,
      genres: insertMovie.genres || null,
      year: insertMovie.year || null,
      runtime: insertMovie.runtime || null,
      rating: insertMovie.rating || null,
      resaleValue: insertMovie.resaleValue || null,
      condition: insertMovie.condition || null,
      loanedTo: insertMovie.loanedTo || null,
      loanedDate: insertMovie.loanedDate || null,
      lastWatchedDate: insertMovie.lastWatchedDate || null,
      subGenres: insertMovie.subGenres || null,
      writers: insertMovie.writers || null,
      tags: insertMovie.tags || null,
      tmdbId: insertMovie.tmdbId || null,
    };
    this.movies.set(id, movie);
    return movie;
  }

  async updateMovie(id: number, updates: UpdateMovie): Promise<Movie | undefined> {
    const movie = this.movies.get(id);
    if (!movie) return undefined;

    const updatedMovie: Movie = { ...movie, ...updates };
    this.movies.set(id, updatedMovie);
    return updatedMovie;
  }

  async markAsWatched(id: number): Promise<Movie | undefined> {
    const movie = this.movies.get(id);
    if (!movie) return undefined;
    
    const updatedMovie: Movie = { ...movie, lastWatchedDate: new Date() };
    this.movies.set(id, updatedMovie);
    return updatedMovie;
  }

  async getRecommendedMovie(): Promise<Movie | null> {
    const allMovies = Array.from(this.movies.values());
    
    // Filter movies that haven't been watched or haven't been watched in a while
    const unwatchedMovies = allMovies.filter(movie => !movie.lastWatchedDate);
    const oldWatchedMovies = allMovies.filter(movie => {
      if (!movie.lastWatchedDate) return false;
      const daysSinceWatched = (Date.now() - movie.lastWatchedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceWatched > 90; // Haven't watched in 3+ months
    });
    
    const candidateMovies = [...unwatchedMovies, ...oldWatchedMovies];
    
    if (candidateMovies.length === 0) return null;
    
    // Return a random movie from candidates, prioritizing unwatched movies
    const randomIndex = Math.floor(Math.random() * candidateMovies.length);
    return candidateMovies[randomIndex];
  }

  async getThreeRecommendedMovies(): Promise<Movie[]> {
    const allMovies = Array.from(this.movies.values());
    
    // Filter movies that haven't been watched or haven't been watched in a while
    const unwatchedMovies = allMovies.filter(movie => !movie.lastWatchedDate);
    const oldWatchedMovies = allMovies.filter(movie => {
      if (!movie.lastWatchedDate) return false;
      const daysSinceWatched = (Date.now() - movie.lastWatchedDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceWatched > 90; // Haven't watched in 3+ months
    });
    
    const candidateMovies = [...unwatchedMovies, ...oldWatchedMovies];
    
    if (candidateMovies.length === 0) return [];
    
    // Shuffle candidates and take up to 3
    const shuffled = candidateMovies.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  async deleteMovie(id: number): Promise<boolean> {
    return this.movies.delete(id);
  }

  async getCollectionStats(): Promise<{
    totalMovies: number;
    totalValue: number;
    formatCounts: Record<string, number>;
    genreCounts: Record<string, number>;
  }> {
    const movies = Array.from(this.movies.values());
    
    const formatCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};
    let totalValue = 0;

    movies.forEach(movie => {
      // Count formats
      formatCounts[movie.format] = (formatCounts[movie.format] || 0) + 1;
      
      // Count genres
      if (movie.genres) {
        movie.genres.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
      
      // Sum values
      if (movie.resaleValue) {
        totalValue += movie.resaleValue;
      }
    });

    return {
      totalMovies: movies.length,
      totalValue,
      formatCounts,
      genreCounts,
    };
  }
}

export const storage = new DatabaseStorage();
