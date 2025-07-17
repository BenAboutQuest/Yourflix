import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { storage } from "./storage";
import { insertMovieSchema, updateMovieSchema, insertUserSchema } from "@shared/schema";
import { tmdbService } from "./services/tmdb";
import { omdbService } from "./services/omdb";
import { openaiService } from "./services/openai";
import { authService } from "./auth";
import { CatalogLookupService } from "./services/catalog-lookup";

// Authentication middleware
interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; email: string; displayName: string };
}

async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await authService.validateSession(sessionId);
    
    if (!result) {
      // Clear invalid session cookie
      res.clearCookie('sessionId');
      return res.status(401).json({ message: "Session expired" });
    }

    req.user = {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      displayName: result.user.displayName,
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
}

// Optional authentication - allows both authenticated and guest users
async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const sessionId = req.cookies.sessionId;
    
    if (sessionId) {
      const result = await authService.validateSession(sessionId);
      if (result) {
        req.user = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.displayName,
        };
      }
    }
    
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    next(); // Continue without auth
  }
}

// Get YouTube trailer using TMDb API
async function getYouTubeTrailer(movie: any): Promise<string | null> {
  try {
    // If we have a TMDb ID, use it to get videos
    if (movie.tmdbId) {
      const trailerData = await tmdbService.getMovieVideos(movie.tmdbId);
      if (trailerData && trailerData.length > 0) {
        // Find the first YouTube trailer
        const trailer = trailerData.find((video: any) => 
          video.site === 'YouTube' && 
          (video.type === 'Trailer' || video.type === 'Teaser')
        );
        if (trailer) {
          return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&controls=1&showinfo=0&rel=0`;
        }
      }
    }
    
    // Fallback: construct a search-based embed (less reliable)
    const searchQuery = `${movie.title} ${movie.year} trailer`;
    const encodedQuery = encodeURIComponent(searchQuery);
    return `https://www.youtube.com/embed?listType=search&list=${encodedQuery}&autoplay=1&controls=1`;
  } catch (error) {
    console.error("Error getting YouTube trailer:", error);
    return null;
  }
}

// Configure image storage directories
const imagesDir = path.join(process.cwd(), 'public', 'images');
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'posters');

// Ensure directories exist
[imagesDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[SETUP] Created directory: ${dir}`);
  }
});

// Also ensure dist directories exist for production builds
const distImagesDir = path.join(process.cwd(), 'dist', 'public', 'images');
const distUploadsDir = path.join(process.cwd(), 'dist', 'public', 'uploads', 'posters');
[distImagesDir, distUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Image compression function using Sharp
async function compressImage(filePath: string, quality: number = 80): Promise<Buffer> {
  try {
    console.log('[IMAGE COMPRESS] Starting compression for:', filePath);
    
    // Get original file stats
    const originalStats = fs.statSync(filePath);
    console.log('[IMAGE COMPRESS] Original size:', (originalStats.size / 1024).toFixed(2), 'KB');
    
    // Compress and resize image
    const compressedBuffer = await sharp(filePath)
      .resize(600, 900, { // Standard poster dimensions
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();
    
    console.log('[IMAGE COMPRESS] Compressed size:', (compressedBuffer.length / 1024).toFixed(2), 'KB');
    console.log('[IMAGE COMPRESS] Compression ratio:', ((1 - compressedBuffer.length / originalStats.size) * 100).toFixed(1) + '%');
    
    return compressedBuffer;
  } catch (error) {
    console.error('[IMAGE COMPRESS] Error compressing image:', error);
    // Fallback to original file if compression fails
    return fs.readFileSync(filePath);
  }
}

// Create two multer configurations - one for main images, one for legacy poster uploads
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('[IMAGE UPLOAD] Setting destination to:', imagesDir);
      cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
      // Generate clean filename with timestamp
      const timestamp = Date.now();
      const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
      const filename = `${timestamp}_${cleanName}`;
      console.log('[IMAGE UPLOAD] Generated filename:', filename);
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('[IMAGE UPLOAD] File filter check - mimetype:', file.mimetype, 'originalname:', file.originalname);
    // Only allow image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      console.log('[IMAGE UPLOAD] File accepted');
      return cb(null, true);
    } else {
      console.log('[IMAGE UPLOAD] File rejected');
      cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed'));
    }
  }
});

// Legacy poster upload (keep for backward compatibility)
const posterUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      console.log('[POSTER UPLOAD] Setting destination to:', uploadsDir);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'poster-' + uniqueSuffix + path.extname(file.originalname);
      console.log('[POSTER UPLOAD] Generated filename:', filename);
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('[POSTER UPLOAD] File filter check - mimetype:', file.mimetype, 'originalname:', file.originalname);
    // Only allow image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      console.log('[POSTER UPLOAD] File accepted');
      return cb(null, true);
    } else {
      console.log('[POSTER UPLOAD] File rejected');
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  
  // Registration endpoint disabled - app is invite-only
  app.post("/api/auth/register", async (req, res) => {
    res.status(403).json({ message: "Registration is currently disabled. This app is invite-only." });
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: "Username/email and password are required" });
      }

      const result = await authService.login(usernameOrEmail, password);
      
      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set secure session cookie
      res.cookie('sessionId', result.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.json({
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.displayName,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = req.cookies.sessionId;
      
      if (sessionId) {
        await authService.logout(sessionId);
      }
      
      res.clearCookie('sessionId');
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/user", optionalAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json(req.user);
  });

  // Catalog lookup endpoint
  // TMDb movie search endpoint
  app.get("/api/movies/search", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }

      const tmdbService = await import('./services/tmdb');
      const results = await tmdbService.searchMovies(q);
      
      res.json({ results });
    } catch (error) {
      console.error('Movie search error:', error);
      res.status(500).json({ message: "Failed to search movies" });
    }
  });

  // TMDb movie details endpoint
  app.get("/api/movies/tmdb/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const tmdbId = parseInt(id);
      
      if (isNaN(tmdbId)) {
        return res.status(400).json({ message: "Invalid TMDb ID" });
      }

      const tmdbService = await import('./services/tmdb');
      const tmdb = new tmdbService.TMDbService();
      const movieDetails = await tmdb.getMovieDetails(tmdbId);
      
      res.json(movieDetails);
    } catch (error) {
      console.error('TMDb details error:', error);
      res.status(500).json({ message: "Failed to fetch movie details" });
    }
  });

  app.post("/api/lookup/catalog", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { catalog_number } = req.body;
      
      if (!catalog_number) {
        return res.status(400).json({ error: "Missing catalog number" });
      }

      console.log(`[CATALOG] User ${req.user!.id} looking up catalog: ${catalog_number}`);
      const result = await CatalogLookupService.lookupCatalogNumber(catalog_number);
      
      // The CatalogLookupService already returns the correct structure
      res.json(result);
    } catch (error) {
      console.error("[CATALOG] Lookup error:", error);
      res.status(500).json({ error: "Catalog lookup failed" });
    }
  });

  // Get all movies with filtering and sorting (requires authentication)
  app.get("/api/movies", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { format, genres, search, sortBy, sortOrder, cast, director, writer } = req.query;
      
      const filters = {
        format: format as string,
        genres: genres ? (genres as string).split(',') : undefined,
        search: search as string,
        cast: cast as string,
        director: director as string,
        writer: writer as string,
        sortBy: sortBy as 'title' | 'year' | 'createdAt' | 'lastWatchedDate',
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      console.log(`[DEBUG] User ${req.user!.id} searching with filters:`, filters);
      const movies = await storage.getMovies(req.user!.id, filters);
      console.log(`[DEBUG] Found ${movies.length} movies for user ${req.user!.id}`);
      
      // If searching, log some details
      if (filters.search) {
        console.log(`[DEBUG] Search query: "${filters.search}" returned ${movies.length} results`);
        if (movies.length > 0) {
          console.log(`[DEBUG] First few results:`, movies.slice(0, 3).map(m => m.title));
        }
      }
      
      res.json(movies);
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).json({ message: "Failed to fetch movies" });
    }
  });

  // Get recommended movie (must come before the dynamic :id route)
  app.get("/api/movies/recommended", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const movie = await storage.getRecommendedMovie(req.user!.id);
      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recommended movie" });
    }
  });

  // Get three recommended movies for sliding view
  app.get("/api/movies/recommended-three", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const movies = await storage.getThreeRecommendedMovies(req.user!.id);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recommended movies" });
    }
  });

  // Get YouTube trailer for a movie
  app.get("/api/movies/:id/trailer", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const movie = await storage.getMovie(req.user!.id, id);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      // Get trailer using TMDb API or fallback to search
      const trailerUrl = await getYouTubeTrailer(movie);
      
      res.json({ trailerUrl });
    } catch (error) {
      console.error("Error getting trailer:", error);
      res.status(500).json({ message: "Failed to get trailer" });
    }
  });

  // Get single movie by ID (requires authentication)
  app.get("/api/movies/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const movie = await storage.getMovie(req.user!.id, id);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch movie" });
    }
  });

  // Search movies by barcode (requires authentication)
  app.get("/api/movies/barcode/:barcode", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const barcode = req.params.barcode;
      const movie = await storage.getMovieByBarcode(req.user!.id, barcode);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to search by barcode" });
    }
  });

  // Search movies by catalog ID
  app.get("/api/movies/catalog/:catalogId", async (req, res) => {
    try {
      const catalogId = req.params.catalogId;
      const movie = await storage.getMovieByCatalogId(catalogId);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to search by catalog ID" });
    }
  });

  // Search movies by catalog number (flexible search)
  app.get("/api/search/catalog", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      const movies = await storage.searchByCatalogNumber(q);
      res.json(movies);
    } catch (error) {
      console.error("Error searching by catalog number:", error);
      res.status(500).json({ message: "Failed to search by catalog number" });
    }
  });

  // Lookup movie information by barcode
  app.get("/api/lookup/barcode/:barcode", async (req, res) => {
    try {
      const { barcode } = req.params;
      
      if (!barcode) {
        return res.status(400).json({ message: "Barcode parameter is required" });
      }

      const { barcodeService } = await import('./services/barcode');
      const result = await barcodeService.lookupByBarcode(barcode);
      
      if (result.found && result.product) {
        res.json({
          found: true,
          movie: {
            title: result.product.title,
            year: result.product.year,
            description: result.product.description,
            category: result.product.category,
            brand: result.product.brand,
            imageUrl: result.product.imageUrl
          }
        });
      } else {
        res.json({
          found: false,
          error: result.error || 'Movie not found for this barcode'
        });
      }
    } catch (error) {
      console.error("Error looking up barcode:", error);
      res.status(500).json({ message: "Failed to lookup barcode" });
    }
  });

  // Lookup movie information by catalog number with full metadata
  app.get("/api/lookup/catalog/:catalogNumber", async (req, res) => {
    try {
      const { catalogNumber } = req.params;
      
      if (!catalogNumber) {
        return res.status(400).json({ message: "Catalog number parameter is required" });
      }

      const { barcodeService } = await import('./services/barcode');
      const result = await barcodeService.lookupByCatalogNumber(catalogNumber);
      
      if (result.found && result.product) {
        // Found catalog info, now enhance with TMDb if we have a good title
        let enhancedMovie = null;
        const searchTitle = result.product.title;
        
        if (searchTitle && searchTitle.length > 2 && !searchTitle.toLowerCase().includes('laserdisc') && !searchTitle.toLowerCase().includes('dvd-') && !searchTitle.toLowerCase().includes('movie from')) {
          try {
            // Search TMDb for enhanced movie information
            const tmdbResults = await tmdbService.searchMovies(searchTitle);
            if (tmdbResults && tmdbResults.length > 0) {
              // Get detailed info for the best match using tmdbId
              const detailedMovie = await tmdbService.getMovieDetails(tmdbResults[0].tmdbId);
              
              // Try to get Rotten Tomatoes score
              let rottenTomatoesScore = null;
              try {
                const ratings = await omdbService.getMovieRatings(detailedMovie.title, detailedMovie.year);
                rottenTomatoesScore = ratings.rottenTomatoesScore;
              } catch (omdbError) {
                console.warn('OMDb lookup failed for catalog result:', omdbError);
              }
              
              enhancedMovie = {
                ...detailedMovie,
                rottenTomatoesScore,
                format: result.product.category || 'Unknown',
                catalogNumber: catalogNumber,
                source: 'catalog_enhanced'
              };
              
              console.log(`Enhanced catalog ${catalogNumber} with TMDb data: ${detailedMovie.title}`);
            }
          } catch (tmdbError) {
            console.warn('TMDb enhancement failed for catalog result:', tmdbError);
          }
        }

        res.json({
          found: true,
          catalogInfo: {
            title: result.product.title,
            year: result.product.year,
            description: result.product.description,
            category: result.product.category,
            brand: result.product.brand,
            imageUrl: result.product.imageUrl
          },
          movie: enhancedMovie,
          enhanced: !!enhancedMovie
        });
      } else {
        res.json({
          found: false,
          error: result.error || 'Movie not found for this catalog number'
        });
      }
    } catch (error) {
      console.error("Error looking up catalog number:", error);
      res.status(500).json({ message: "Failed to lookup catalog number" });
    }
  });

  // Add new movie with automatic metadata scraping (requires authentication)
  app.post("/api/movies", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      // Add userId from authenticated user
      const movieDataWithUserId = { ...req.body, userId: req.user!.id };
      const movieData = insertMovieSchema.parse(movieDataWithUserId);
      let scrapedFromBarcode = false;
      
      // STEP 1: Try barcode lookup first (most precise)
      if (movieData.barcode && !movieData.title) {
        try {
          const { barcodeService } = await import('./services/barcode');
          const barcodeResult = await barcodeService.lookupByBarcode(movieData.barcode);
          
          if (barcodeResult.found && barcodeResult.product) {
            console.log(`Found movie from barcode ${movieData.barcode}: ${barcodeResult.product.title}`);
            movieData.title = barcodeResult.product.title;
            if (barcodeResult.product.year) movieData.year = barcodeResult.product.year;
            if (barcodeResult.product.description) movieData.description = barcodeResult.product.description;
            scrapedFromBarcode = true;
          }
        } catch (barcodeError) {
          console.warn('Barcode lookup failed:', barcodeError);
        }
      }

      // STEP 2: Try catalog number lookup (for LaserDisc, DVD, Blu-ray)
      if (movieData.catalogId && !movieData.title && !scrapedFromBarcode) {
        try {
          const { barcodeService } = await import('./services/barcode');
          const catalogResult = await barcodeService.lookupByCatalogNumber(movieData.catalogId);
          
          if (catalogResult.found && catalogResult.product) {
            console.log(`Found movie from catalog ${movieData.catalogId}: ${catalogResult.product.title}`);
            movieData.title = catalogResult.product.title;
            if (catalogResult.product.year) movieData.year = catalogResult.product.year;
            if (catalogResult.product.description) movieData.description = catalogResult.product.description;
            scrapedFromBarcode = true;
          }
        } catch (catalogError) {
          console.warn('Catalog number lookup failed:', catalogError);
        }
      }
      
      // STEP 3: Try TMDb search (for detailed movie metadata)
      if (movieData.title && !movieData.posterUrl) {
        try {
          const searchResults = await tmdbService.searchMovies(movieData.title);
          if (searchResults.length > 0) {
            // Find the best match by title and year
            let bestMatch = searchResults[0];
            if (movieData.year) {
              const exactMatch = searchResults.find(movie => 
                movie.year === movieData.year && 
                movie.title.toLowerCase().includes(movieData.title.toLowerCase())
              );
              if (exactMatch) bestMatch = exactMatch;
            }
            
            console.log(`Found TMDb match for ${movieData.title}: ${bestMatch.title} (${bestMatch.year})`);
            
            // Update movie data with scraped information
            if (bestMatch.posterUrl) movieData.posterUrl = bestMatch.posterUrl;
            if (bestMatch.backdropUrl) movieData.backdropUrl = bestMatch.backdropUrl;
            if (!movieData.description && bestMatch.description) movieData.description = bestMatch.description;
            if (!movieData.genres || movieData.genres.length === 0) movieData.genres = bestMatch.genres;
            if (bestMatch.tmdbId) movieData.tmdbId = bestMatch.tmdbId;
            
            // If barcode lookup didn't provide year, use TMDb year
            if (!movieData.year && bestMatch.year) movieData.year = bestMatch.year;
          }
        } catch (tmdbError) {
          console.warn('TMDb scraping failed, proceeding without metadata:', tmdbError);
        }
      }

      // STEP 4: Get Rotten Tomatoes score from OMDb API
      if (movieData.title && !movieData.rottenTomatoesScore) {
        try {
          const { omdbService } = await import('./services/omdb');
          const ratings = await omdbService.getMovieRatings(movieData.title, movieData.year);
          if (ratings.rottenTomatoesScore) {
            movieData.rottenTomatoesScore = ratings.rottenTomatoesScore;
            console.log(`Found RT score for ${movieData.title}: ${ratings.rottenTomatoesScore}%`);
          }
        } catch (omdbError) {
          console.warn('OMDb ratings fetch failed:', omdbError);
        }
      }
      
      // STEP 5: Get YouTube trailer if we have TMDb ID and no custom trailer URL
      if (movieData.tmdbId && !movieData.youtubeTrailerUrl) {
        try {
          const trailerUrl = await getYouTubeTrailer(movieData);
          if (trailerUrl) {
            movieData.youtubeTrailerUrl = trailerUrl;
            console.log(`Found YouTube trailer for ${movieData.title}: ${trailerUrl}`);
          }
        } catch (trailerError) {
          console.warn('YouTube trailer fetch failed:', trailerError);
        }
      }
      
      // STEP 6: OpenAI fallback for description if still missing
      if (!movieData.description && movieData.title) {
        try {
          const aiDescription = await openaiService.enhanceMovieDescription(movieData.title);
          if (aiDescription) movieData.description = aiDescription;
        } catch (aiError) {
          console.warn('OpenAI description generation failed:', aiError);
        }
      }
      
      // Add user ID to movie data
      movieData.userId = req.user!.id;
      
      const movie = await storage.createMovie(movieData);
      res.status(201).json(movie);
    } catch (error: any) {
      console.error("Error creating movie:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid movie data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create movie", error: error.message });
    }
  });

  // Update movie (requires authentication)
  app.patch("/api/movies/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[PATCH] Update movie ${id} for user ${req.user!.id}:`, JSON.stringify(req.body, null, 2));
      
      const updates = updateMovieSchema.parse(req.body);
      console.log(`[PATCH] Parsed updates:`, JSON.stringify(updates, null, 2));
      
      const movie = await storage.updateMovie(req.user!.id, id, updates);
      console.log(`[PATCH] Updated movie result:`, movie ? `${movie.title} - Notes: "${movie.notes}" - Rating: ${movie.personalRating} - Poster: ${movie.posterUrl}` : 'Not found');
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Update movie error:", error);
      res.status(500).json({ message: "Failed to update movie" });
    }
  });

  // Full update movie (requires authentication) - for edit modal
  app.put("/api/movies/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("PUT /api/movies/:id received data:", JSON.stringify(req.body, null, 2));
      
      const updates = updateMovieSchema.parse(req.body);
      console.log("Parsed updates:", JSON.stringify(updates, null, 2));
      
      const movie = await storage.updateMovie(req.user!.id, id, updates);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      console.error("Update movie error:", error);
      res.status(500).json({ message: "Failed to update movie" });
    }
  });

  // Mark movie as watched
  app.put("/api/movies/:id/watch", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const movie = await storage.markAsWatched(req.user!.id, id);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark movie as watched" });
    }
  });

  // Loan movie to someone
  app.patch("/api/movies/:id/loan", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { loanedToName, expectedReturnDate, loanNotes } = req.body;
      
      if (!loanedToName || !expectedReturnDate) {
        return res.status(400).json({ message: "Missing required loan information" });
      }

      const movie = await storage.loanMovie(req.user!.id, id, {
        loanedToName,
        expectedReturnDate: new Date(expectedReturnDate),
        loanNotes,
      });
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to loan movie" });
    }
  });

  // Return movie from loan
  app.patch("/api/movies/:id/return", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const movie = await storage.returnMovie(req.user!.id, id);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to return movie" });
    }
  });

  // Get all loaned movies
  app.get("/api/loans", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const movies = await storage.getLoanedMovies(req.user!.id);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loaned movies" });
    }
  });

  // Get overdue loans
  app.get("/api/loans/overdue", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const movies = await storage.getOverdueLoans(req.user!.id);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overdue loans" });
    }
  });

  // Delete movie (requires authentication)
  app.delete("/api/movies/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteMovie(req.user!.id, id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Movie not found" });
      }

      res.json({ message: "Movie deleted successfully" });
    } catch (error) {
      console.error("Delete movie error:", error);
      res.status(500).json({ message: "Failed to delete movie" });
    }
  });

  // Get collection statistics (requires authentication)
  app.get("/api/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getCollectionStats(req.user!.id);
      console.log(`[STATS] User ${req.user!.id} collection stats:`, JSON.stringify(stats, null, 2));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching collection stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Upload movie image (new primary image upload endpoint)
  app.post("/api/upload/image", authenticateUser, (req, res, next) => {
    console.log('[IMAGE UPLOAD] Starting upload for user:', req.user?.username);
    
    imageUpload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('[IMAGE UPLOAD] Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ message: "Upload failed" });
      }
      
      try {
        console.log('[IMAGE UPLOAD] Multer completed successfully');
        
        if (!req.file) {
          console.log('[IMAGE UPLOAD] No file in request after multer');
          return res.status(400).json({ message: "No image file uploaded" });
        }

        console.log('[IMAGE UPLOAD] File details:', {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Verify file exists before reading
        if (!fs.existsSync(req.file.path)) {
          console.error('[IMAGE UPLOAD] File does not exist at path:', req.file.path);
          return res.status(500).json({ message: "File upload failed - file not found" });
        }

        // Compress image before converting to base64
        const compressedBuffer = await compressImage(req.file.path, 85);
        const base64Image = compressedBuffer.toString('base64');
        const mimeType = 'image/jpeg'; // Always JPEG after compression
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        console.log('[IMAGE UPLOAD] Compressed and converted to base64 data URL, length:', dataUrl.length);

        // Clean up the temporary file
        try {
          fs.unlinkSync(req.file.path);
          console.log('[IMAGE UPLOAD] Cleaned up temporary file');
        } catch (cleanupError) {
          console.warn('[IMAGE UPLOAD] Could not clean up temporary file:', cleanupError);
        }

        res.json({ 
          imageUrl: dataUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        });
      } catch (error) {
        console.error("[IMAGE UPLOAD] Error processing upload:", error);
        res.status(500).json({ message: "Failed to process uploaded image" });
      }
    });
  });

  // Legacy poster upload endpoint (keep for backward compatibility)
  app.post("/api/upload/poster", authenticateUser, (req, res, next) => {
    console.log('[POSTER UPLOAD] Starting upload for user:', req.user?.username);
    
    posterUpload.single('poster')(req, res, async (err) => {
      if (err) {
        console.error('[POSTER UPLOAD] Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        return res.status(500).json({ message: "Upload failed" });
      }
      
      try {
        console.log('[POSTER UPLOAD] Multer completed successfully');
        
        if (!req.file) {
          console.log('[POSTER UPLOAD] No file in request after multer');
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log('[POSTER UPLOAD] File details:', {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Verify file exists before reading
        if (!fs.existsSync(req.file.path)) {
          console.error('[POSTER UPLOAD] File does not exist at path:', req.file.path);
          return res.status(500).json({ message: "File upload failed - file not found" });
        }

        // Compress poster before converting to base64
        const compressedBuffer = await compressImage(req.file.path, 85);
        const base64Image = compressedBuffer.toString('base64');
        const mimeType = 'image/jpeg'; // Always JPEG after compression
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        console.log('[POSTER UPLOAD] Compressed and converted to base64 data URL, length:', dataUrl.length);

        // Clean up the temporary file
        try {
          fs.unlinkSync(req.file.path);
          console.log('[POSTER UPLOAD] Cleaned up temporary file');
        } catch (cleanupError) {
          console.warn('[POSTER UPLOAD] Could not clean up temporary file:', cleanupError);
        }

        res.json({ posterUrl: dataUrl });
      } catch (error) {
        console.error("[POSTER UPLOAD] Error processing upload:", error);
        res.status(500).json({ message: "Failed to process uploaded poster" });
      }
    });
  });

  // Admin middleware - only allow admin user
  async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.username !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  }

  // Admin routes
  app.get("/api/admin/users", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await authService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/create-user", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, email, password, displayName } = req.body;
      
      if (!username || !email || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const result = await authService.register({
        username,
        email,
        password,
        displayName,
      });

      res.json({
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          displayName: result.user.displayName,
        }
      });
    } catch (error) {
      if (error.message === 'Username or email already exists') {
        return res.status(409).json({ message: error.message });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/admin/users/:id", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const deleted = await authService.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Delete uploaded poster
  app.delete("/api/upload/poster/:filename", (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        res.json({ message: "Poster deleted successfully" });
      } else {
        res.status(404).json({ message: "Poster not found" });
      }
    } catch (error) {
      console.error("Error deleting poster:", error);
      res.status(500).json({ message: "Failed to delete poster" });
    }
  });

  // Search TMDb for movies
  app.get("/api/search/tmdb", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
      }

      const results = await tmdbService.searchMovies(query as string);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to search TMDb" });
    }
  });

  // Get detailed movie info from TMDb
  app.get("/api/tmdb/:id", async (req, res) => {
    try {
      const tmdbId = parseInt(req.params.id);
      const movieDetails = await tmdbService.getMovieDetails(tmdbId);
      res.json(movieDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch movie details" });
    }
  });

  // Generate movie metadata using AI
  app.post("/api/generate-metadata", async (req, res) => {
    try {
      const { title, year } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const metadata = await openaiService.generateMovieMetadata(title, year);
      res.json(metadata);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to generate metadata" });
    }
  });

  // Enhance movie description using AI
  app.post("/api/enhance-description", async (req, res) => {
    try {
      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      const enhancedDescription = await openaiService.enhanceMovieDescription(title, description);
      res.json({ description: enhancedDescription });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to enhance description" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
