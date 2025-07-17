# YourFlix - Movie Collection Catalogue

## Overview

YourFlix is a visual and intelligent catalogue application for movie enthusiasts who collect physical media formats like LaserDiscs, VHS, DVDs, and Blu-rays. The application provides automatic metadata scraping, AI-powered fallback generation, and comprehensive collection management with two distinct browsing modes: a Netflix-style genre-based view for discovery and a traditional grid view for detailed filtering and search.

## Recent Changes (January 2025)

✓ **Invite-Only Security**: Made app private with disabled registration and secure access control (January 12, 2025)
✓ **API Key Security Fix**: Removed hardcoded TMDb API keys from source code, using environment variables only
✓ **Movie Addition Bug Fix**: Fixed critical authentication and API formatting issues preventing new movies from being added properly (January 12, 2025)
✓ **Location Update Feature**: Completed location update functionality replacing "coming soon" placeholder with working input form
✓ **Trailer System Fix**: Updated TMDb IDs for WALL-E, Spawn to fix incorrect trailer issues
✓ **Database Cleanup**: Removed duplicate movie entries causing display confusion
✓ **App Rebranding**: Renamed from "All Our Jars" to "YourFlix"
✓ **Audio Controls**: Added mute/unmute button for trailer playback
✓ **UI Cleanup**: Removed redundant format filtering and quick action overlays
✓ **Layout Enhancement**: Reorganized collection header with centered title and statistics
✓ **Major UI Redesign**: Implemented dual-view system with genre-based browsing as default
✓ **Genre Browse View**: Movies organized into horizontal scrollable rows by genre
✓ **Collection Overview**: Added header with collection stats and view mode toggles
✓ **Format Filter Bar**: Restored format filtering across both view modes with "All" as default
✓ **Search Modal**: Replaced inline search with dedicated popup modal
✓ **Header Simplification**: Removed QR code button, moved to Add Movie modal
✓ **Poster Coverage**: Achieved 100% poster coverage with TMDb integration (85/85 movies)
✓ **Recommendation Tiles**: Transformed to swipeable 3-movie carousel with touch navigation
✓ **YouTube Trailers**: Auto-playing muted trailers in movie detail screens via TMDb API
✓ **Settings Page**: Comprehensive settings for customizing front page genres, sub-genres, ordering, and recommendations toggle
✓ **Faith Films Genre**: Added new main genre "Faith Films" with 5 sample movies and dedicated sub-genres
✓ **Switch UI Enhancement**: Changed settings switches to orange for better visibility
✓ **Simplified Add Movie Modal**: Streamlined interface with cleaner layout and fewer complex sections
✓ **Catalog Number Search**: Implemented flexible search by catalog ID/barcode with partial matching
✓ **Multi-Version Display**: Added support for multiple versions of same movie with grouping and expansion
✓ **Enhanced Search Modal**: Added two-tab interface for title search and catalog number search with live results
✓ **Comprehensive Catalog Database**: Expanded Pioneer LaserDisc catalog recognition with PILF-2070 (Aliens), PILF-1001 (Raiders), and more
✓ **Enhanced Catalog Lookup Integration**: Fixed Add Movie modal to use online database search with complete TMDb and OMDb integration
✓ **Google Search Integration**: Successfully implemented real Google Custom Search API for unknown catalog numbers with pattern recognition fallback
✓ **SF078-5064 Support**: Added Heat (1995) catalog recognition with complete TMDb metadata and 84% Rotten Tomatoes score
✓ **Real-Time Web Search**: Catalog lookup now uses authentic Google search results with intelligent movie pattern matching
✓ **Simplified Google Search**: Implemented direct format + catalog search (e.g., "LaserDisc PILF-0002") for accurate movie title extraction
✓ **Smart Title Extraction**: Enhanced pattern recognition to extract movie titles directly from LaserDisc database search results
✓ **PILF-0002 Fixed**: Corrected mapping from Star Wars to "The Chaplain" (1917) - authentic catalog data
✓ **Accurate Catalog Lookup**: System now correctly identifies movies from real LaserDisc database patterns
✓ **External Data Only**: Catalog lookup feature now exclusively uses Google search - no internal fallback data
✓ **Clear Separation**: Front page search = internal database, Add Movie catalog search = Google only
✓ **Simplified Add Movie Modal**: Removed QR code/barcode scanning and catalog lookup, keeping only search and manual create options
✓ **User-Controlled Values**: Added estimated value field and catalog number field for manual user input
✓ **Technical Specifications**: Added aspect ratio, language, audio format, and technical details fields for comprehensive media cataloging (January 12, 2025)
✓ **Database Export Feature**: Added Excel export functionality to settings page for complete collection backup with all metadata (January 12, 2025)
✓ **YouTube Trailer Links**: Added ability to specify custom YouTube trailer URLs when adding/editing movies with automatic display in movie details (January 12, 2025)
✓ **Catalog Number Lookup**: Implemented Google search integration with LDDB.com scraping for automatic movie metadata retrieval from LaserDisc catalog numbers (January 13, 2025)
✓ **Simplified Schema Restructure**: Completely rebuilt database schema and Add Movie form with only essential fields - removed legacy complexity and focused on core metadata (January 13, 2025)
✓ **Media Format System**: Added comprehensive format field with LaserDisc, DVD, Blu-ray, 4K UHD, VHS, Betamax, and Digital options - required field with smart defaults (January 14, 2025)
✓ **Fixed Catalog Lookup Integration**: Resolved nested data structure issue preventing form field population from LDDB catalog search results (January 14, 2025)
✓ **Enhanced LDDB Scraping**: Improved year extraction and CSS targeting for reliable metadata extraction from LaserDisc database (January 14, 2025)
✓ **Fixed Poster Upload System**: Resolved static file serving for both development and production environments with dual-path storage (January 14, 2025)
✓ **Complete Catalog-to-Database Flow**: Fixed userId injection issue preventing catalog lookup results from being saved to user collections (January 14, 2025)
✓ **YouTube Trailer Scraping Restored**: Re-enabled automatic YouTube trailer fetching during movie creation using TMDb video API (January 14, 2025)
✓ **Edit Movie Enhancement**: Added sub-genre support back to edit modal with smart filtering based on main genre selections (January 14, 2025)
✓ **Enhanced Catalog Lookup**: Combined LDDB and TMDb data sources - catalog lookup now gets accurate metadata from LDDB then enhances with TMDb descriptions, posters, and details (January 14, 2025)
✓ **Title-First Search Method**: Reorganized Add Movie modal to prioritize movie title search with TMDb's high-quality data over catalog lookup for better user experience (January 14, 2025)
✓ **Dual-Field Title Search**: Added catalog number as optional second field in title search for combined metadata approach with automatic field population (January 14, 2025)
✓ **Loan and Location Features Fixed**: Restored missing schema fields (isLoaned, loanedToName, loanDate, expectedReturnDate, actualReturnDate, loanNotes, location) to fix broken loan tracking and location functionality (January 14, 2025)
✓ **Smart Unified Search**: Created intelligent search that detects movie titles vs catalog numbers automatically and combines both data sources for optimal results (January 14, 2025)
✓ **Fixed Pricing Input**: Resolved controlled/uncontrolled input issues for estimated value and condition fields with proper placeholder handling (January 14, 2025)
✓ **Simplified UI with Smart Search**: Consolidated search options into single intelligent search that auto-detects movie titles vs catalog numbers, plus manual entry option (January 14, 2025)
✓ **Enhanced YouTube Trailer Scraping**: Integrated automatic YouTube trailer fetching during TMDb searches using official TMDb video API (January 14, 2025)
✓ **True Data Source Combination**: Smart search now properly combines TMDb and LDDB data when both fields provided, preserving the best information from each source without overwriting (January 14, 2025)
✓ **Catalog-Only Entry Support**: Added fallback functionality when TMDb has no matches - users can proceed with just catalog data and add manually (January 14, 2025)
✓ **Smart Catalog Detection**: Enhanced smart search to automatically detect when titles might be catalog numbers and try LDDB lookup as fallback (January 14, 2025)
✓ **Refined Search Logic**: Perfected dual-field search behavior - title+catalog uses both sources, catalog-only uses LDDB only, failed title search falls back to catalog data (January 14, 2025)
✓ **Format Auto-Detection**: LDDB catalog lookups now automatically set format as "LaserDisc", TMDb searches default to "DVD" - no more incorrect defaults (January 14, 2025)
✓ **Flexible Field Usage**: Both title and catalog number fields are now optional - can search with either field or both for maximum data gathering (January 14, 2025)
✓ **Enhanced Catalog Matching**: Improved LDDB search to find exact catalog number matches instead of random first results, with better pattern recognition for formats like "TSL-1" (January 14, 2025)
✓ **Silent Error Handling**: Fixed false error messages during successful dual-field searches by improving async error handling and fallback logic (January 14, 2025)
✓ **True Data Source Combination**: Smart search now properly combines TMDb and LDDB data when both fields provided, preserving the best information from each source without overwriting (January 14, 2025)
✓ **Description Preservation**: Fixed catalog enhancement to never overwrite TMDb descriptions, which are much richer than LDDB titles (January 14, 2025)
✓ **Dual-Source Search Working**: Successfully implemented true dual-source search combining TMDb rich metadata with LDDB technical specifications (January 14, 2025)
✓ **Loan Management System Fixed**: Resolved return functionality issues and added "Loaned Out" navigation button in collection header with live count display (January 14, 2025)
✓ **Loans Page Navigation**: Added back button to loans page for easy return to main collection view (January 14, 2025)
✓ **Collection Value Fix**: Fixed collection statistics to properly sum estimated values from database using correct field name (January 14, 2025)
✓ **Personal Rating API Fix**: Corrected API call format in rating selector component for proper 1-5 star rating persistence (January 14, 2025)
✓ **Poster Prioritization Enhancement**: Improved TMDb poster prioritization over LDDB covers in catalog lookup system (January 14, 2025)
✓ **Critical Poster Upload Fix**: Resolved poster upload filesystem persistence issue where files were saved to database but not persisting on disk - added comprehensive debugging and file verification (January 14, 2025)
✓ **Aspect Ratio Preservation System**: Implemented comprehensive system ensuring all movie posters maintain consistent height (300px) while preserving original aspect ratios for variable width display (January 16, 2025)
✓ **Multi-Image Support Enhancement**: Added availableImages database field and ImageSelector component allowing users to manage multiple poster options per movie with upload and selection capabilities (January 16, 2025)
✓ **Grid Layout Optimization**: Updated genre rows and movie grid to use flexible containers supporting variable-width posters while maintaining shelf-like height alignment (January 16, 2025)
✓ **RangeError Bug Fix**: Fixed critical star rating display error in movie detail modal causing crashes with invalid condition values (January 16, 2025)
✓ **Optimal Image Spacing System**: Implemented perfect balance between consistent spacing and preserved aspect ratios with fixed container widths and centered flexible images (January 16, 2025)
✓ **Reverted to Original Image Sizing**: Removed intelligent aspect ratio detection system and restored simple uniform poster sizing with standard 0.67 aspect ratio for consistent display (January 16, 2025)
✓ **Base64 Image Storage Solution**: Implemented base64 data URL storage for uploaded images instead of static file serving to ensure persistence in Replit environment - images are now converted to base64 on upload and stored directly in database (January 16, 2025)
✓ **Automatic Image Compression**: Added Sharp library integration for automatic image compression and resizing - all uploaded images are optimized to 600x900px max with 85% JPEG quality before base64 conversion for reduced storage and faster loading (January 16, 2025)

## User Authentication System (January 12, 2025)

✓ **Complete Authentication**: Implemented full user registration, login, and session management
✓ **Individual User Profiles**: Each user now has their own isolated movie collection
✓ **Secure Sessions**: Cookie-based authentication with bcrypt password hashing
✓ **User-Specific Data**: All movie operations now filtered by authenticated user ID
✓ **Protected Routes**: Frontend authentication guards protect movie collection pages
✓ **Database Schema**: Added users and sessions tables with proper foreign key relationships
✓ **Registration/Login Pages**: Beautiful, responsive authentication forms with validation
✓ **Session Management**: Automatic session validation and renewal with 30-day expiration
✓ **Custom Logo Integration**: Added YourFlix branded logo to header replacing text title
✓ **Colorful UI Enhancement**: Added animated gradient backgrounds, dot patterns, and colorful accents while maintaining orange/black theme

## Personal Notes and Rotten Tomatoes Integration (January 12, 2025)

✓ **Personal Notes System**: Added notes function to movie detail pages for personal thoughts and opinions
✓ **Rich Notes Interface**: In-place editing with save/cancel functionality and clear visual feedback
✓ **Rotten Tomatoes Scores**: Integrated OMDb API to automatically fetch RT critic scores for movies
✓ **Visual RT Display**: Prominent tomato icon display showing percentage scores in movie details
✓ **Database Schema**: Added notes and rottenTomatoesScore fields to movies table
✓ **Auto-Fetching**: RT scores automatically retrieved when adding new movies through external APIs

## Enhanced Add Movie Input Methods (January 12, 2025)

✓ **Four Input Methods**: Redesigned modal with clear options for Scan Barcode, Search by Title, Catalog Number, Manual Entry
✓ **External Database Search**: Title search uses TMDb (The Movie Database) for authentic movie metadata and posters
✓ **Format-Aware Search**: Users select format first, then search shows results will be added in that format
✓ **Intelligent Search Results**: Enhanced display with movie posters, descriptions, and helpful search tips
✓ **LaserDisc Support**: Special handling for LaserDisc format with guidance since LDDB has no public API
✓ **Catalog Number Search**: Search existing collection by catalog ID/barcode before adding duplicates
✓ **Improved User Experience**: Clear navigation, back buttons, and contextual help throughout the process

## Button Styling Fix (January 12, 2025)

✓ **Fixed White Text on White Background**: Resolved button readability issues by updating CSS variables
✓ **Orange Primary Buttons**: Changed primary button color from dark to orange accent for better visibility
✓ **Dark Theme Optimization**: Updated root CSS variables to properly support dark theme throughout app
✓ **Improved Contrast**: All buttons now have proper contrast for readability in dark interface

## Barcode and Catalog Number Lookup System (January 12, 2025)

✓ **Intelligent Movie Scraping**: Created comprehensive lookup system for automatic metadata retrieval
✓ **Barcode Lookup Service**: Supports Go-UPC, Barcode Lookup API, and UPCitemdb for UPC/EAN scanning
✓ **Catalog Number Support**: Working LaserDisc, DVD, and Blu-ray catalog number lookups with pattern recognition
✓ **Multi-Step Process**: Barcode → Catalog → TMDb → OMDb → OpenAI fallback chain
✓ **Smart Title Extraction**: Automatically cleans product titles to extract movie names
✓ **API Integration Ready**: Supports multiple barcode APIs with environment variable configuration
✓ **Comprehensive Coverage**: Works with DVD, Blu-ray, VHS, and LaserDisc formats
✓ **Smart Pattern Recognition**: Recognizes Criterion Collection (CC-xxx), Pioneer LaserDisc (PILF-xxxx), and generic formats
✓ **Known Database Integration**: Pre-loaded with common Criterion and Pioneer catalog numbers and movie titles

## Version Information System (January 12, 2025)

✓ **Simple Version Field**: Added user-friendly "Version/Edition Info" text field to replace complex catalog numbers
✓ **Flexible Descriptions**: Users can enter descriptive text like "Director's Cut", "Criterion Collection", "Limited Edition"
✓ **Enhanced Movie Detail Display**: Version information prominently displayed in movie detail modal
✓ **Database Schema Update**: Added version field to movies table with automatic database migration
✓ **User-Friendly Interface**: Clear placeholder text and helpful descriptions guide users on what to enter

## Version Information System (January 12, 2025)

✓ **Simple Version Field**: Added user-friendly "Version/Edition Info" text field to replace complex catalog numbers
✓ **Flexible Descriptions**: Users can enter descriptive text like "Director's Cut", "Criterion Collection", "Limited Edition"
✓ **Enhanced Movie Detail Display**: Version information prominently displayed in movie detail modal
✓ **Database Schema Update**: Added version field to movies table with automatic database migration
✓ **User-Friendly Interface**: Clear placeholder text and helpful descriptions guide users on what to enter

## Poster Upload System (January 12, 2025)

✓ **Custom Poster Upload**: Full poster upload system with file validation and storage
✓ **Add Movie Modal**: Upload poster artwork during movie addition with preview and removal
✓ **Movie Detail Modal**: Replace existing posters with hover overlay and upload button
✓ **Server Infrastructure**: Multer integration with 5MB limits and image-only filtering
✓ **File Management**: Organized uploads in /public/uploads/posters/ with unique filenames
✓ **User Control**: Complete poster management - upload, preview, replace, and remove functionality

## Trailer System Fix (January 12, 2025)

✓ **TMDb API Integration**: Configured TMDb API key for authentic trailer data
✓ **Real Trailers**: Fixed broken YouTube search embeds with direct TMDb trailer links
✓ **Movie Updates**: Updated key movies (Jurassic Park, Spawn, The Matrix) with proper TMDb IDs
✓ **Improved Reliability**: Trailers now load consistently with official YouTube embed URLs
✓ **Version Navigation**: Fixed "Other Versions" functionality to properly switch between movie versions

## Major Database Cleanup (January 12, 2025)

✓ **Duplicate Movie Removal**: Cleaned 84 duplicate movies from database (170 → 86 unique movies)
✓ **Genre Normalization**: Fixed "History" → "Historical" genre mismatch
✓ **Collection Display**: All movies now properly categorized and displayed in genre view
✓ **Settings Integration**: Default genre settings properly saved to localStorage

## Real Movie Poster System (January 12, 2025)

✓ **TMDb Integration**: Successfully integrated The Movie Database API for authentic movie posters
✓ **100% Coverage**: All 86 movies now have authentic TMDb poster artwork
✓ **Reliable Source**: Uses TMDb CDN which is stable and won't break like external scraped sources
✓ **High Quality**: 500px width posters for crisp, professional display
✓ **Future-Proof**: New movies added will automatically get TMDb posters through existing integration
✓ **No More Broken Images**: Eliminated dependency on unreliable external poster sources

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom dark theme design system
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon Database)
- **Development**: Hot module replacement with Vite integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon Database serverless platform
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Drizzle Kit for database schema management
- **Schema Location**: Shared between client and server in `/shared/schema.ts`

### Authentication and Authorization
- **Current State**: No authentication system implemented
- **Session Management**: Express session middleware configured but unused
- **Security**: Basic CORS and request logging middleware

## Key Components

### Database Schema
- **Movies Table**: Comprehensive movie metadata storage including:
  - Basic info (title, year, runtime, rating, description)
  - Visual assets (poster, backdrop URLs)
  - People (director, cast array)
  - Classification (genres array, format)
  - Physical tracking (location, catalog ID, barcode)
  - Financial (resale value)
  - External references (TMDb ID)

### API Endpoints
- `GET /api/movies` - Retrieve movies with filtering and sorting
- `GET /api/movies/:id` - Get single movie details
- `GET /api/movies/barcode/:barcode` - Search by barcode
- `GET /api/movies/:id/trailer` - Get YouTube trailer URL for movie
- `GET /api/movies/recommended-three` - Get 3 recommended movies for carousel
- `POST /api/movies` - Add new movie (with metadata scraping)
- `PUT /api/movies/:id` - Update existing movie
- `DELETE /api/movies/:id` - Remove movie from collection
- `GET /api/stats` - Collection statistics and counts

### External Service Integrations
- **TMDb Service**: The Movie Database API for metadata retrieval
- **OpenAI Service**: GPT-4o for AI-powered metadata generation as fallback
- **Catalog Lookup Service**: Google search and LDDB.com scraping for LaserDisc catalog numbers
- **Barcode Support**: UPC/EAN scanning capability (frontend prepared)

### Frontend Components
- **Genre Browse View**: Default view showing movies organized by genre in horizontal scrollable rows
- **Collection Overview**: Header showing total movies, value, and view mode toggle buttons
- **Format Filter Bar**: Horizontal filter bar for selecting media formats (All, DVD, Blu-ray, etc.)
- **Genre Row**: Individual scrollable row for each genre with navigation arrows
- **Movie Grid**: Traditional responsive grid layout for full collection display
- **Filter Bar**: Dynamic filtering by format, genre, and sorting options (grid view only)
- **Search Modal**: Popup search interface replacing inline search bar
- **Add Movie Modal**: Multi-step movie addition with metadata options and barcode scanning
- **Movie Detail Modal**: Full movie information display with auto-playing YouTube trailers
- **Recommendation Carousel**: Swipeable 3-movie recommendation tiles with touch navigation

## Data Flow

### Movie Addition Process
1. User initiates add movie (manual, search, or barcode scan)
2. If barcode provided, search existing database first
3. Attempt metadata scraping from TMDb API
4. Fallback to OpenAI metadata generation if TMDb fails
5. Allow manual metadata entry/editing
6. Store in PostgreSQL database via Drizzle ORM

### Collection Browsing
**Genre View (Default):**
1. Movies automatically grouped by genre using MAIN_GENRES
2. Each genre displayed as horizontal scrollable row
3. Format filtering applies across all genre rows
4. Smooth scrolling with arrow navigation on hover

**Grid View (Full List):**
1. Frontend requests movies with current filters/search
2. Backend queries PostgreSQL with Drizzle ORM
3. Apply filtering (format, genres), sorting, and search
4. Return paginated results with metadata
5. Frontend renders in responsive grid layout

### Real-time Updates
- TanStack Query manages cache invalidation
- Optimistic updates for better user experience
- Automatic refetching on window focus and network reconnection

## External Dependencies

### Core Runtime
- Node.js and Express.js for backend server
- React and TypeScript for frontend application
- Vite for development and build tooling

### Database and ORM
- PostgreSQL database (Neon Database serverless)
- Drizzle ORM for type-safe database operations
- Drizzle Kit for schema migrations

### External APIs
- The Movie Database (TMDb) API for movie metadata
- OpenAI API (GPT-4o) for AI-generated metadata fallback
- Environment variables required: `DATABASE_URL`, `TMDB_API_KEY`, `OPENAI_API_KEY`

### UI and Styling
- Radix UI for accessible component primitives
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography
- React Hook Form with Zod validation

## Deployment Strategy

### Development Environment
- Vite dev server with HMR for frontend
- TSX for TypeScript execution in development
- Concurrent frontend/backend development with proxy

### Production Build
- Vite builds optimized frontend bundle to `dist/public`
- ESBuild bundles backend to `dist/index.js`
- Static file serving from Express for SPA deployment
- Environment-based configuration for database and API keys

### Database Management
- Drizzle migrations for schema versioning
- `npm run db:push` for development schema updates
- PostgreSQL connection via environment variable

### Hosting Considerations
- Requires Node.js runtime environment
- PostgreSQL database connection
- Environment variables for external API keys
- Static asset serving capability for frontend bundle