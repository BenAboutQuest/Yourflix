interface BarcodeProduct {
  title: string;
  description?: string;
  category?: string;
  brand?: string;
  model?: string;
  year?: number;
  imageUrl?: string;
}

interface BarcodeApiResponse {
  found: boolean;
  product?: BarcodeProduct;
  error?: string;
}

export class BarcodeService {
  private goUpcApiKey: string | null = null;
  private barcodeLookupApiKey: string | null = null;

  constructor() {
    // These API keys would need to be provided by user if they want barcode lookup
    this.goUpcApiKey = process.env.GO_UPC_API_KEY || null;
    this.barcodeLookupApiKey = process.env.BARCODE_LOOKUP_API_KEY || null;
  }

  /**
   * Lookup movie information by barcode/UPC
   * Tries multiple services in order of preference
   */
  async lookupByBarcode(barcode: string): Promise<BarcodeApiResponse> {
    console.log(`Looking up barcode: ${barcode}`);

    // Try Go-UPC API first (most reliable for movies)
    if (this.goUpcApiKey) {
      try {
        const goUpcResult = await this.lookupGoUpc(barcode);
        if (goUpcResult.found) {
          return goUpcResult;
        }
      } catch (error) {
        console.warn('Go-UPC lookup failed:', error);
      }
    }

    // Try Barcode Lookup API as fallback
    if (this.barcodeLookupApiKey) {
      try {
        const barcodeLookupResult = await this.lookupBarcodeLookup(barcode);
        if (barcodeLookupResult.found) {
          return barcodeLookupResult;
        }
      } catch (error) {
        console.warn('Barcode Lookup API failed:', error);
      }
    }

    // Try UPCitemdb (free but limited)
    try {
      const upcItemResult = await this.lookupUpcItemDb(barcode);
      if (upcItemResult.found) {
        return upcItemResult;
      }
    } catch (error) {
      console.warn('UPCitemdb lookup failed:', error);
    }

    return {
      found: false,
      error: 'No barcode lookup services available. Please add GO_UPC_API_KEY or BARCODE_LOOKUP_API_KEY environment variables.'
    };
  }

  /**
   * Go-UPC API lookup (most comprehensive)
   */
  private async lookupGoUpc(barcode: string): Promise<BarcodeApiResponse> {
    const response = await fetch(`https://go-upc.com/api/v1/code/${barcode}`, {
      headers: {
        'Authorization': `Bearer ${this.goUpcApiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Go-UPC API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.product && data.product.title) {
      return {
        found: true,
        product: {
          title: this.extractMovieTitle(data.product.title),
          description: data.product.description || undefined,
          category: data.product.category || undefined,
          brand: data.product.brand || undefined,
          year: this.extractYear(data.product.title),
          imageUrl: data.product.image_url || undefined
        }
      };
    }

    return { found: false };
  }

  /**
   * Barcode Lookup API (good documentation)
   */
  private async lookupBarcodeLookup(barcode: string): Promise<BarcodeApiResponse> {
    const response = await fetch(`https://api.barcodelookup.com/v3/products?barcode=${barcode}&key=${this.barcodeLookupApiKey}`);

    if (!response.ok) {
      throw new Error(`Barcode Lookup API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      const product = data.products[0];
      return {
        found: true,
        product: {
          title: this.extractMovieTitle(product.title || product.product_name),
          description: product.description || undefined,
          category: product.category || undefined,
          brand: product.brand || undefined,
          year: this.extractYear(product.title || product.product_name),
          imageUrl: product.images?.[0] || undefined
        }
      };
    }

    return { found: false };
  }

  /**
   * UPCitemdb (free but limited requests)
   */
  private async lookupUpcItemDb(barcode: string): Promise<BarcodeApiResponse> {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);

    if (!response.ok) {
      throw new Error(`UPCitemdb API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        found: true,
        product: {
          title: this.extractMovieTitle(item.title),
          description: item.description || undefined,
          category: item.category || undefined,
          brand: item.brand || undefined,
          year: this.extractYear(item.title),
          imageUrl: item.images?.[0] || undefined
        }
      };
    }

    return { found: false };
  }

  /**
   * Extract clean movie title from product title
   * Removes format info, year, and other metadata
   */
  private extractMovieTitle(productTitle: string): string {
    if (!productTitle) return '';
    
    // Remove common DVD/Blu-ray indicators
    let title = productTitle
      .replace(/\s*\(DVD\)/gi, '')
      .replace(/\s*\(Blu-ray\)/gi, '')
      .replace(/\s*\(VHS\)/gi, '')
      .replace(/\s*\(LaserDisc\)/gi, '')
      .replace(/\s*DVD\s*/gi, ' ')
      .replace(/\s*Blu-ray\s*/gi, ' ')
      .replace(/\s*VHS\s*/gi, ' ')
      .replace(/\s*LaserDisc\s*/gi, ' ')
      .replace(/\s*4K\s*/gi, ' ')
      .replace(/\s*Ultra HD\s*/gi, ' ')
      .replace(/\s*Director's Cut\s*/gi, ' ')
      .replace(/\s*Extended Edition\s*/gi, ' ')
      .replace(/\s*Special Edition\s*/gi, ' ')
      .replace(/\s*Collector's Edition\s*/gi, ' ')
      .replace(/\s*Criterion Collection\s*/gi, ' ')
      .replace(/\s*Widescreen\s*/gi, ' ')
      .replace(/\s*Full Screen\s*/gi, ' ')
      .replace(/\s*\[\w+\]\s*/gi, ' ') // Remove format codes like [DVD]
      .replace(/\s*\(\d{4}\)\s*/gi, ' ') // Remove year in parentheses
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return title;
  }

  /**
   * Extract year from product title
   */
  private extractYear(productTitle: string): number | undefined {
    if (!productTitle) return undefined;
    
    // Look for 4-digit year in parentheses or at end
    const yearMatch = productTitle.match(/\((\d{4})\)|(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1] || yearMatch[2]);
      // Only return reasonable movie years
      if (year >= 1890 && year <= new Date().getFullYear() + 2) {
        return year;
      }
    }
    
    return undefined;
  }

  /**
   * Extract movie information from catalog number
   * For LaserDisc, DVD, and Blu-ray catalog numbers
   */
  async lookupByCatalogNumber(catalogNumber: string): Promise<BarcodeApiResponse> {
    console.log(`Looking up catalog number: ${catalogNumber}`);
    
    // Try different catalog number lookup strategies based on format
    // Start with pattern recognition for known catalogs, then try external sources
    const strategies = [
      () => this.searchGenericCatalog(catalogNumber), // Try pattern recognition first
      () => this.searchGenericWebSearch(catalogNumber), // Try web search for unknown catalogs
      () => this.searchDiscogs(catalogNumber),
      () => this.searchCriterionCollection(catalogNumber),
      () => this.searchLddb(catalogNumber)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result.found) {
          return result;
        }
      } catch (error) {
        console.warn(`Catalog lookup strategy failed:`, error);
      }
    }

    return {
      found: false,
      error: 'No catalog number found in available databases. Try barcode lookup or manual entry.'
    };
  }

  /**
   * Search Discogs database for catalog numbers
   * Discogs has extensive LaserDisc, DVD, and Blu-ray data
   */
  private async searchDiscogs(catalogNumber: string): Promise<BarcodeApiResponse> {
    try {
      // Discogs API requires authentication, check if we have a token
      const discogsToken = process.env.DISCOGS_TOKEN;
      
      if (!discogsToken) {
        console.log('Discogs token not available, skipping Discogs search');
        return { found: false };
      }

      // Discogs API search by catalog number
      const response = await fetch(`https://api.discogs.com/database/search?catno=${encodeURIComponent(catalogNumber)}&type=release&format=DVD,Blu-ray,LaserDisc&per_page=5`, {
        headers: {
          'User-Agent': 'YourFlix/1.0 +https://yourflix.app',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Find the best match for movies
        const movieResult = data.results.find((result: any) => 
          result.format && result.format.some((f: string) => 
            f.toLowerCase().includes('dvd') || 
            f.toLowerCase().includes('blu-ray') || 
            f.toLowerCase().includes('laserdisc')
          )
        ) || data.results[0];

        if (movieResult) {
          console.log(`Found movie in Discogs: ${movieResult.title}`);
          return {
            found: true,
            product: {
              title: this.extractMovieTitle(movieResult.title),
              year: movieResult.year || this.extractYear(movieResult.title),
              description: movieResult.notes || undefined,
              category: movieResult.format?.join(', ') || undefined,
              brand: movieResult.label?.join(', ') || undefined,
              imageUrl: movieResult.cover_image || undefined
            }
          };
        }
      }
    } catch (error) {
      console.warn('Discogs search failed:', error);
    }

    return { found: false };
  }

  /**
   * Search LDDB (LaserDisc Database) for catalog numbers
   * Specialized for LaserDisc releases
   */
  private async searchLddb(catalogNumber: string): Promise<BarcodeApiResponse> {
    try {
      // LDDB search by catalog number using their reference search
      const searchUrl = `https://www.lddb.com/search.php`;
      const params = new URLSearchParams({
        'reference': catalogNumber,
        'format': 'ld',
        'max': '10'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        throw new Error(`LDDB search failed: ${response.status}`);
      }

      const html = await response.text();
      
      // Parse HTML to extract movie information
      const movieInfo = this.parseLddbHtml(html, catalogNumber);
      
      if (movieInfo.title && !movieInfo.title.startsWith('LaserDisc ') && movieInfo.title !== catalogNumber) {
        console.log(`Found movie in LDDB: ${movieInfo.title}`);
        return {
          found: true,
          product: {
            title: movieInfo.title,
            year: movieInfo.year,
            description: movieInfo.description,
            category: 'LaserDisc',
            brand: movieInfo.brand || 'LaserDisc'
          }
        };
      }
    } catch (error) {
      console.warn('LDDB search failed:', error);
    }

    return { found: false };
  }

  /**
   * Search Criterion Collection website for catalog numbers
   */
  private async searchCriterionCollection(catalogNumber: string): Promise<BarcodeApiResponse> {
    try {
      // Extract Criterion number from catalog
      const criterionMatch = catalogNumber.match(/^CC-?(\d+)$/i);
      if (!criterionMatch) {
        return { found: false };
      }

      const criterionNumber = criterionMatch[1];
      
      // Search Criterion website
      const searchUrl = `https://www.criterion.com/films`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Criterion search failed: ${response.status}`);
      }

      const html = await response.text();
      const movieInfo = this.parseCriterionHtml(html, criterionNumber);
      
      if (movieInfo.title) {
        console.log(`Found movie in Criterion Collection: ${movieInfo.title}`);
        return {
          found: true,
          product: {
            title: movieInfo.title,
            year: movieInfo.year,
            description: movieInfo.description,
            category: 'Criterion Collection',
            brand: 'Criterion Collection'
          }
        };
      }
    } catch (error) {
      console.warn('Criterion Collection search failed:', error);
    }

    return { found: false };
  }

  /**
   * Generic catalog number search using web search
   * Falls back to searching for the catalog number online
   */
  private async searchGenericCatalog(catalogNumber: string): Promise<BarcodeApiResponse> {
    try {
      // Extract movie info from the catalog number pattern
      const catalogInfo = this.parseCatalogNumber(catalogNumber);
      
      if (catalogInfo.format && catalogInfo.possibleTitle) {
        // Only return if we have a specific movie title
        return {
          found: true,
          product: {
            title: catalogInfo.possibleTitle,
            year: catalogInfo.year,
            description: `Found ${catalogInfo.possibleTitle} for catalog ${catalogNumber}`,
            category: catalogInfo.format
          }
        };
      }
      
      // If we only have format info, continue to web search
      if (catalogInfo.format) {
        console.log(`Format recognized as ${catalogInfo.format}, trying web search for movie title`);
        return { found: false }; // Continue to next strategy
      }
    } catch (error) {
      console.warn('Generic catalog search failed:', error);
    }

    return { found: false };
  }

  /**
   * Parse catalog number to extract format information only
   * Movie titles must come from external Google search
   */
  private parseCatalogNumber(catalogNumber: string): {
    possibleTitle?: string;
    year?: number;
    format?: string;
  } {
    // Common catalog number patterns:
    // DVD-0001, BD-0003, LD-12345, CC-1234 (Criterion Collection)
    // PILF-0002, ML-1234, etc.
    
    const patterns = [
      // Criterion Collection (CC-xxxx, CCxxxxL) - format only, titles from Google
      {
        regex: /^CC-?(\d+)L?$/i,
        format: 'Criterion Collection',
        lookup: (match: RegExpMatchArray) => {
          const hasL = match[0].toUpperCase().endsWith('L');
          const format = hasL ? 'Criterion Collection LaserDisc' : 'Criterion Collection DVD';
          return { format };
        }
      },
      // Pioneer LaserDisc (PILF-xxxx) - format only, titles from Google
      {
        regex: /^PILF-?(\d+)$/i,
        format: 'Pioneer LaserDisc',
        lookup: () => ({ format: 'Pioneer LaserDisc' })
      },
      // DVD format - generic
      {
        regex: /^DVD-?(\d+)$/i,
        format: 'DVD',
        lookup: () => ({ format: 'DVD' })
      },
      // Blu-ray format - generic
      {
        regex: /^B[DR]?-?(\d+)$/i,
        format: 'Blu-ray',
        lookup: () => ({ format: 'Blu-ray' })
      },
      // LaserDisc format - generic and manufacturer patterns
      {
        regex: /^L[D]?-?(\d+)$/i,
        format: 'LaserDisc',
        lookup: () => ({ format: 'LaserDisc' })
      },
      // Columbia LaserDisc (CLP-series)
      {
        regex: /^CLP-?(\d+)$/i,
        format: 'Columbia LaserDisc',
        lookup: () => ({ format: 'Columbia LaserDisc' })
      },
      // Warner Bros LaserDisc (1D-series, ID-series)
      {
        regex: /^1?ID?-?(\d+)$/i,
        format: 'Warner Bros LaserDisc',
        lookup: () => ({ format: 'Warner Bros LaserDisc' })
      },
      // Paramount LaserDisc (LV-series)
      {
        regex: /^LV-?(\d+)$/i,
        format: 'Paramount LaserDisc',
        lookup: () => ({ format: 'Paramount LaserDisc' })
      },
      // Universal Pictures LaserDisc
      {
        regex: /^ML-?(\d+)$/i,
        format: 'Universal LaserDisc',
        lookup: () => ({ format: 'Universal LaserDisc' })
      },
      // Warner Bros LaserDisc
      {
        regex: /^WB-?(\d+)$/i,
        format: 'Warner Bros LaserDisc',
        lookup: () => ({ format: 'Warner Bros LaserDisc' })
      }
    ];

    for (const pattern of patterns) {
      const match = catalogNumber.match(pattern.regex);
      if (match) {
        const info = pattern.lookup(match);
        return {
          format: pattern.format,
          ...info
        };
      }
    }

    return { format: 'Unknown Format' };
  }

  /**
   * Generic web search for catalog numbers
   */
  private async searchGenericWebSearch(catalogNumber: string): Promise<BarcodeApiResponse> {
    try {
      // Search for the catalog number online to find movie information
      const searchQuery = `"${catalogNumber}" movie LaserDisc DVD Blu-ray film title`;
      console.log(`Searching web for catalog: ${catalogNumber}`);
      
      // Use web search to find information about this catalog number
      const searchResults = await this.performWebSearch(searchQuery);
      
      if (searchResults && searchResults.title) {
        return {
          found: true,
          product: {
            title: searchResults.title,
            year: searchResults.year,
            description: `Found via web search for catalog ${catalogNumber}`,
            category: searchResults.format || 'Physical Media'
          }
        };
      }
    } catch (error) {
      console.warn('Web search failed:', error);
    }

    return { found: false };
  }

  /**
   * Perform web search for catalog number information
   */
  private async performWebSearch(query: string): Promise<{
    title?: string;
    year?: number;
    format?: string;
  } | null> {
    try {
      console.log(`Performing web search for: ${query}`);
      
      // Use the actual web search functionality
      // This will search for catalog numbers online to find movie information
      const searchResults = await this.searchWeb(query);
      
      if (searchResults && searchResults.length > 0) {
        // Extract movie information from search results
        const movieInfo = this.extractMovieFromSearchResults(searchResults, query);
        return movieInfo;
      }
      
      return null;
    } catch (error) {
      console.warn('Web search failed:', error);
      return null;
    }
  }

  /**
   * Simple Google search for catalog numbers with format
   */
  private async searchWeb(query: string): Promise<string[]> {
    try {
      // Extract catalog number for focused search
      const catalogMatch = query.match(/"([^"]+)"/);
      if (!catalogMatch) return [];
      
      const catalogNumber = catalogMatch[1];
      
      // Try Google Custom Search API first with simple format + catalog search
      const apiKey = process.env.GOOGLE_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      
      if (apiKey && searchEngineId) {
        try {
          // Simple search: "LaserDisc PILF-0002" or "DVD ABC-123"
          const format = this.guessFormatFromCatalog(catalogNumber);
          const searchQuery = `"${format} ${catalogNumber}"`;
          const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}`;
          
          console.log(`Google searching: ${searchQuery}`);
          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
              return data.items.map((item: any) => `${item.title} ${item.snippet}`);
            }
          }
        } catch (error) {
          console.warn('Google Search API failed:', error);
        }
      }
      
      // No fallback - catalog lookup requires real Google search
      console.log('Google Search API not available - catalog lookup requires external search');
      return [];
      
    } catch (error) {
      console.warn('Web search integration failed:', error);
      return [];
    }
  }

  /**
   * Guess the format from catalog number pattern
   */
  private guessFormatFromCatalog(catalogNumber: string): string {
    if (catalogNumber.match(/^PILF/i)) return 'LaserDisc';
    if (catalogNumber.match(/^LV/i)) return 'LaserDisc';
    if (catalogNumber.match(/^SF/i)) return 'LaserDisc';
    if (catalogNumber.match(/^CC/i)) return 'LaserDisc';
    if (catalogNumber.match(/^DVD/i)) return 'DVD';
    if (catalogNumber.match(/^BD/i)) return 'Blu-ray';
    return 'LaserDisc'; // Default to LaserDisc for most catalog patterns
  }
  
  // Removed generateSearchResults - catalog lookup only uses real Google search

  /**
   * Extract movie information from Google search results
   */
  private extractMovieFromSearchResults(results: string[], originalQuery: string): {
    title?: string;
    year?: number;
    format?: string;
  } | null {
    // For simple Google searches like "LaserDisc PILF-0002", extract movie title directly
    for (const result of results) {
      console.log(`Analyzing search result: "${result}"`);
      
      // Try to extract movie title from search result patterns
      const movieTitle = this.extractMovieTitleFromResult(result);
      if (movieTitle) {
        const year = this.extractYearFromResult(result);
        const format = this.extractFormatFromResult(result);
        
        console.log(`Extracted: ${movieTitle} (${year}) [${format}]`);
        return {
          title: movieTitle,
          year: year,
          format: format || 'LaserDisc'
        };
      }
    }
    
    return null;
  }

  /**
   * Extract movie title from a search result
   */
  private extractMovieTitleFromResult(result: string): string | null {
    // Common patterns in LaserDisc database results
    // Example: "PILF-0002 Jaws LaserDisc Database"
    // Example: "Jaws (1975) - PILF-0002 - LaserDisc Database"
    
    // Pattern 1: Catalog followed by movie title
    let match = result.match(/[A-Z]{2,4}[-]?\d{3,5}\s+([^-\(\)]+?)(?:\s*[-\(\)]|\s*laser|\s*dvd|\s*blu|$)/i);
    if (match && match[1]) {
      const title = match[1].trim();
      if (this.isValidMovieTitle(title)) {
        return this.cleanMovieTitle(title);
      }
    }
    
    // Pattern 2: Movie title before catalog number
    match = result.match(/^([^-\(\)]+?)\s*[-\(\)]\s*[A-Z]{2,4}[-]?\d{3,5}/i);
    if (match && match[1]) {
      const title = match[1].trim();
      if (this.isValidMovieTitle(title)) {
        return this.cleanMovieTitle(title);
      }
    }
    
    // Pattern 3: Look for common movie words and extract surrounding title
    const movieKeywords = /\b(movie|film|cinema|director|starring|cast|plot)\b/i;
    if (movieKeywords.test(result)) {
      // Extract potential title before these keywords
      const beforeKeywords = result.split(/\b(?:movie|film|cinema|director|starring|cast|plot)\b/i)[0];
      const potentialTitle = beforeKeywords.replace(/[A-Z]{2,4}[-]?\d{3,5}/, '').trim();
      
      if (this.isValidMovieTitle(potentialTitle)) {
        return this.cleanMovieTitle(potentialTitle);
      }
    }
    
    return null;
  }

  /**
   * Check if a string looks like a valid movie title
   */
  private isValidMovieTitle(title: string): boolean {
    if (!title || title.length < 2 || title.length > 100) return false;
    
    // Skip common non-movie words
    const skipWords = /^(database|entry|catalog|collection|search|results?|page|site|home|index|laserdisc|dvd|blu[-]?ray)$/i;
    if (skipWords.test(title.trim())) return false;
    
    // Must contain letters
    if (!/[a-zA-Z]/.test(title)) return false;
    
    return true;
  }

  /**
   * Clean and format movie title
   */
  private cleanMovieTitle(title: string): string {
    return title
      .replace(/^\s*[-\(\)]\s*/, '') // Remove leading punctuation
      .replace(/\s*[-\(\)]\s*$/, '') // Remove trailing punctuation  
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Extract year from search result
   */
  private extractYearFromResult(result: string): number | undefined {
    const yearMatch = result.match(/\b(19\d{2}|20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : undefined;
  }

  /**
   * Extract format from search result
   */
  private extractFormatFromResult(result: string): string | undefined {
    if (/laserdisc/i.test(result)) return 'LaserDisc';
    if (/dvd/i.test(result)) return 'DVD';
    if (/blu[-]?ray/i.test(result)) return 'Blu-ray';
    if (/criterion/i.test(result)) return 'Criterion Collection';
    return undefined;
  }

  /**
   * Parse LDDB HTML response to extract movie information
   */
  private parseLddbHtml(html: string, catalogNumber: string): {
    title?: string;
    year?: number;
    description?: string;
    brand?: string;
  } {
    try {
      // LDDB search results contain links to individual LaserDisc entries
      const linkMatches = html.match(/<a[^>]*href="\/laserdisc\/[^"]*"[^>]*>([^<]+)<\/a>/gi);
      
      if (linkMatches && linkMatches.length > 0) {
        // Extract title from the first search result link
        const firstLinkMatch = linkMatches[0].match(/>([^<]+)<\/a>/);
        let title = firstLinkMatch?.[1]?.trim();
        
        if (title && title.length > 2 && !title.includes('Search') && !title.includes('Database') && !title.startsWith('LaserDisc ')) {
          // Clean up the title (remove common LaserDisc artifacts)
          title = title.replace(/\s*\([^)]*\)\s*$/, ''); // Remove trailing parentheses
          title = title.replace(/\s*-\s*LaserDisc.*$/, ''); // Remove LaserDisc suffix
          title = title.trim();
          
          // Look for year information in the page
          const yearMatches = html.match(/(\d{4})/g);
          let year: number | undefined;
          
          if (yearMatches) {
            // Find years that look like movie release years (1920-2030)
            const validYears = yearMatches
              .map(y => parseInt(y))
              .filter(y => y >= 1920 && y <= 2030)
              .sort();
            
            year = validYears[0]; // Take the earliest valid year
          }
          
          return {
            title,
            year,
            description: `Found in LDDB LaserDisc Database for catalog ${catalogNumber}`,
            brand: 'LaserDisc'
          };
        }
      }
      
      // Check if we found no results
      if (html.includes('No results found') || html.includes('0 results')) {
        return {};
      }
      
      // As a last resort, check if catalog number appears in any meaningful context
      const catalogPattern = new RegExp(catalogNumber.replace(/[-]/g, '[-]?'), 'i');
      if (catalogPattern.test(html)) {
        // The catalog number exists on the page, which suggests it's a valid entry
        // but we couldn't parse the title properly
        return {
          title: `LaserDisc ${catalogNumber}`,
          description: `LaserDisc catalog number ${catalogNumber} found in database`,
          brand: 'LaserDisc'
        };
      }
      
      return {};
    } catch (error) {
      console.warn('Failed to parse LDDB HTML:', error);
      return {};
    }
  }

  /**
   * Parse Criterion Collection HTML to extract movie information
   */
  private parseCriterionHtml(html: string, criterionNumber: string): {
    title?: string;
    year?: number;
    description?: string;
  } {
    try {
      // Parse Criterion Collection website HTML
      // This would need actual implementation based on their site structure
      return {};
    } catch (error) {
      console.warn('Failed to parse Criterion HTML:', error);
      return {};
    }
  }
}

export const barcodeService = new BarcodeService();