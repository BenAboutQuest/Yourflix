import axios from 'axios';
import * as cheerio from 'cheerio';

interface CatalogMetadata {
  title: string;
  country?: string;
  year?: number;
  description?: string;
  runtime?: number;
  pictureFormat?: string;
  catalogueNumber?: string;
  director?: string;
  actors: string[];
  genres: string[];
  coverUrl?: string;
  youtubeTrailerUrl?: string;
  infoPageLink: string;
}

interface CatalogLookupResult {
  status: 'success' | 'not_found' | 'error';
  data?: CatalogMetadata;
  message?: string;
}

export class CatalogLookupService {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  private static readonly SEARCH_TIMEOUT = 10000; // 10 seconds

  /**
   * Search Google for catalog number on LDDB.com with multiple search patterns
   */
  private static async searchLDDBCatalogNumber(catalogNumber: string): Promise<string | null> {
    const searchPatterns = [
      `"${catalogNumber}" site:lddb.com`,
      `${catalogNumber.toUpperCase()} site:lddb.com`,
      `"${catalogNumber.toUpperCase()}" site:lddb.com`,
      `"${catalogNumber}" laserdisc site:lddb.com`,
      `${catalogNumber} laserdisc site:lddb.com`
    ];

    for (const query of searchPatterns) {
      try {
        console.log(`[CATALOG] Searching Google for: ${query}`);
        
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
        
        const response = await axios.get(googleSearchUrl, {
          headers: { 
            'User-Agent': this.USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout: this.SEARCH_TIMEOUT,
        });
        
        const $ = cheerio.load(response.data);
        console.log(`[CATALOG] Response received, searching for LDDB links...`);
        
        // Look for LDDB links in search results with multiple selectors
        let lddbUrl: string | null = null;
        
        // Try different selectors for Google search results
        const linkSelectors = ['a[href]', 'a[href*="lddb.com"]', '.yuRUbf a', '.g a[href]'];
        
        for (const selector of linkSelectors) {
          $(selector).each((_, element) => {
            const href = $(element).attr('href') || '';
            
            if (href.includes('lddb.com')) {
              console.log(`[CATALOG] Found potential LDDB link: ${href}`);
              
              let cleanedUrl = href;
              
              // Clean Google redirect URL
              if (href.startsWith('/url?q=')) {
                cleanedUrl = decodeURIComponent(href.split('&')[0].replace('/url?q=', ''));
              } else if (href.startsWith('https://www.lddb.com')) {
                cleanedUrl = href;
              }
              
              // Check if this looks like a valid LDDB URL
              if (cleanedUrl.includes('lddb.com') && (
                cleanedUrl.includes('/laserdisc/') || 
                cleanedUrl.includes('/title/') ||
                cleanedUrl.includes(catalogNumber.toLowerCase())
              )) {
                lddbUrl = cleanedUrl;
                console.log(`[CATALOG] Selected LDDB URL: ${lddbUrl}`);
                return false; // Break the loop
              }
            }
          });
          
          if (lddbUrl) break;
        }
        
        if (lddbUrl) {
          return lddbUrl;
        }
        
        // Wait a moment between different search patterns
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[CATALOG] Error with search pattern "${query}":`, error);
        continue;
      }
    }
    
    // If Google search fails, try direct LDDB search
    return await this.tryDirectLDDBSearch(catalogNumber);
  }

  /**
   * Try searching LDDB directly (fallback method)
   */
  private static async tryDirectLDDBSearch(catalogNumber: string): Promise<string | null> {
    try {
      console.log(`[CATALOG] Trying direct LDDB search for: ${catalogNumber}`);
      
      // Try different LDDB search URLs
      const searchUrls = [
        `https://www.lddb.com/search.php?search=${encodeURIComponent(catalogNumber)}`,
        `https://www.lddb.com/search?q=${encodeURIComponent(catalogNumber)}`,
      ];
      
      for (const searchUrl of searchUrls) {
        try {
          const response = await axios.get(searchUrl, {
            headers: { 'User-Agent': this.USER_AGENT },
            timeout: this.SEARCH_TIMEOUT,
          });
          
          const $ = cheerio.load(response.data);
          
          // Look for laserdisc links in search results
          let foundUrl: string | null = null;
          
          $('a[href*="/laserdisc/"]').each((_, element) => {
            const href = $(element).attr('href');
            if (href) {
              // Get the full URL
              const fullUrl = href.startsWith('http') ? href : `https://www.lddb.com${href}`;
              
              // Check if this link contains our catalog number (case insensitive)
              const urlLower = fullUrl.toLowerCase();
              const catalogLower = catalogNumber.toLowerCase();
              
              // More precise matching - check for exact catalog number in URL or text
              if (urlLower.includes(catalogLower) || 
                  urlLower.includes(catalogLower.replace('-', '')) ||
                  urlLower.includes(catalogLower.replace(' ', '-'))) {
                foundUrl = fullUrl;
                console.log(`[CATALOG] Found matching LDDB result: ${foundUrl}`);
                return false;
              }
            }
          });
          
          // Also check the link text for catalog numbers
          if (!foundUrl) {
            $('a[href*="/laserdisc/"]').each((_, element) => {
              const href = $(element).attr('href');
              const linkText = $(element).text().trim();
              
              if (href && linkText) {
                const fullUrl = href.startsWith('http') ? href : `https://www.lddb.com${href}`;
                const textLower = linkText.toLowerCase();
                const catalogLower = catalogNumber.toLowerCase();
                
                if (textLower.includes(catalogLower) || 
                    textLower.includes(`[${catalogLower}]`) ||
                    textLower.includes(`(${catalogLower})`)) {
                  foundUrl = fullUrl;
                  console.log(`[CATALOG] Found catalog in link text: ${linkText} -> ${foundUrl}`);
                  return false;
                }
              }
            });
          }
          
          // Only take first result if we're confident it might be related
          if (!foundUrl) {
            console.log(`[CATALOG] No exact match found for "${catalogNumber}" in LDDB search results`);
            // Don't take random first result - require some match
          }
          
          if (foundUrl) {
            return foundUrl;
          }
        } catch (error) {
          console.error(`[CATALOG] Direct search failed for ${searchUrl}:`, error);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`[CATALOG] Direct LDDB search failed:`, error);
      return null;
    }
  }

  /**
   * Scrape movie metadata from LDDB page
   */
  private static async scrapeLDDBMetadata(lddbUrl: string): Promise<CatalogMetadata | null> {
    try {
      console.log(`[CATALOG] Scraping LDDB page: ${lddbUrl}`);
      
      const response = await axios.get(lddbUrl, {
        headers: { 'User-Agent': this.USER_AGENT },
        timeout: this.SEARCH_TIMEOUT,
      });
      
      const $ = cheerio.load(response.data);
      
      const metadata: CatalogMetadata = {
        title: 'Unknown Title',
        actors: [],
        genres: [],
        infoPageLink: lddbUrl,
      };
      
      // Extract title from page title or h1
      const titleElement = $('title').first();
      if (titleElement.length > 0) {
        const titleText = titleElement.text().trim();
        console.log(`[CATALOG] Raw page title: "${titleText}"`);
        
        // Extract movie title from "LaserDisc Database - Movie Title [catalog] on LD LaserDisc" format
        if (titleText.includes('LaserDisc Database - ')) {
          let movieTitle = titleText.replace('LaserDisc Database - ', '').trim();
          // Remove catalog number and " on LD LaserDisc" suffix
          movieTitle = movieTitle.replace(/\s*\[\d+\]\s*on\s*LD\s*LaserDisc/i, '').trim();
          metadata.title = movieTitle;
        } else {
          // Remove " [LaserDisc]" or similar suffixes
          const titleMatch = titleText.match(/(.+?)\s*\[/);
          if (titleMatch) {
            metadata.title = titleMatch[1].trim();
          } else {
            metadata.title = titleText.split(' - ')[0].trim();
          }
        }
      }
      
      // Look for h1 or h2 title as backup
      const h1Element = $('h1').first();
      const h2Element = $('h2.lddb').first();
      
      if (h2Element.length > 0 && metadata.title === 'Unknown Title') {
        const h2Text = h2Element.text().trim();
        console.log(`[CATALOG] Found h2 title: "${h2Text}"`);
        // Extract title from "Bloodsport (1988) [37062]" format
        const titleMatch = h2Text.match(/^([^(]+)/);
        if (titleMatch) {
          metadata.title = titleMatch[1].trim();
        } else {
          metadata.title = h2Text;
        }
      } else if (h1Element.length > 0 && metadata.title === 'Unknown Title') {
        metadata.title = h1Element.text().trim();
      }
      
      // Extract year from title or page content
      const yearMatch = $.html().match(/\((\d{4})\)/);
      if (yearMatch) {
        metadata.year = parseInt(yearMatch[1]);
      }
      
      // Look for cover image
      let coverImg = $('img[src*="cover"], img[src*="poster"]').first();
      if (coverImg.length === 0) {
        // Try any image with reasonable dimensions
        coverImg = $('img[width]').filter((_, el) => {
          const width = $(el).attr('width');
          return width && parseInt(width) > 100;
        }).first();
      }
      
      if (coverImg.length > 0) {
        const coverSrc = coverImg.attr('src');
        if (coverSrc) {
          if (coverSrc.startsWith('/')) {
            metadata.coverUrl = 'https://www.lddb.com' + coverSrc;
          } else if (coverSrc.startsWith('http')) {
            metadata.coverUrl = coverSrc;
          }
        }
      }
      
      // Enhanced metadata extraction - look for various patterns
      const pageText = $.html();
      console.log(`[CATALOG] Searching for metadata patterns in page...`);
      
      // Look for metadata in description lists
      $('dt').each((_, dtElement) => {
        const dt = $(dtElement);
        const dd = dt.next('dd');
        
        if (dd.length > 0) {
          const label = dt.text().trim().toLowerCase();
          const value = dd.text().trim();
          console.log(`[CATALOG] Found dt/dd pair: "${label}" -> "${value}"`);
          
          if (label.includes('director')) {
            metadata.director = value;
          } else if (label.includes('runtime') || label.includes('duration')) {
            const runtimeMatch = value.match(/(\d+)/);
            if (runtimeMatch) {
              metadata.runtime = parseInt(runtimeMatch[1]);
            }
          } else if (label.includes('catalog') || label.includes('number')) {
            metadata.catalogueNumber = value;
          } else if (label.includes('country') || label.includes('origin')) {
            metadata.country = value;
          } else if (label.includes('format') || label.includes('picture')) {
            metadata.pictureFormat = value;
          } else if (label.includes('genre') || label.includes('category')) {
            metadata.genres = value.split(',').map(g => g.trim()).filter(g => g.length > 0);
          }
        }
      });
      
      // Look for LDDB-specific table patterns with proper CSS class targeting
      $('td.field').each((_, fieldCell) => {
        const label = $(fieldCell).text().trim().toLowerCase().replace(/\s+/g, ' ');
        const dataCell = $(fieldCell).next('td.data');
        
        if (dataCell.length > 0) {
          const value = dataCell.text().trim();
          
          // Skip empty values
          if (!value || value.length === 0 || value.match(/^\s*(&nbsp;)?\s*$/)) {
            return;
          }
          
          console.log(`[CATALOG] Processing field: "${label}" -> "${value}"`);
          
          // Extract specific LDDB fields
          if (label === 'country') {
            metadata.country = value;
            console.log(`[CATALOG] ✓ Country: ${value}`);
          } else if (label === 'released') {
            const yearMatch = value.match(/(\d{4})/);
            if (yearMatch) {
              metadata.year = parseInt(yearMatch[1]);
              console.log(`[CATALOG] ✓ Year: ${metadata.year}`);
            }
          } else if (label === 'category') {
            // Clean up category/genre - remove HTML links but keep text
            const cleanGenre = dataCell.text().trim();
            if (cleanGenre && cleanGenre.length > 0) {
              metadata.genres = [cleanGenre];
              console.log(`[CATALOG] ✓ Genre: ${cleanGenre}`);
            }
          } else if (label === 'length') {
            const runtimeMatch = value.match(/(\d+)\s*min/);
            if (runtimeMatch) {
              metadata.runtime = parseInt(runtimeMatch[1]);
              console.log(`[CATALOG] ✓ Runtime: ${metadata.runtime} min`);
            }
          } else if (label === 'picture') {
            metadata.pictureFormat = value;
            console.log(`[CATALOG] ✓ Picture Format: ${value}`);
          } else if (label === 'director') {
            metadata.director = value;
            console.log(`[CATALOG] ✓ Director: ${value}`);
          }
        }
      });
      
      // Look for text patterns in the page
      const directorMatch = pageText.match(/director[:\s]*([^<\n]+)/i);
      if (directorMatch && !metadata.director) {
        metadata.director = directorMatch[1].trim();
        console.log(`[CATALOG] Found director via regex: "${metadata.director}"`);
      }
      
      const countryMatch = pageText.match(/country[:\s]*([^<\n]+)/i);
      if (countryMatch && !metadata.country) {
        metadata.country = countryMatch[1].trim();
        console.log(`[CATALOG] Found country via regex: "${metadata.country}"`);
      }
      
      // Look for cast information
      $('a[href*="/person/"]').each((_, element) => {
        const castMember = $(element).text().trim();
        if (castMember && metadata.actors.length < 5) {
          metadata.actors.push(castMember);
        }
      });
      
      // Try to extract description
      let description = $('div[class*="description"]').first().text().trim();
      if (!description) {
        description = $('p').filter((_, el) => $(el).text().length > 50).first().text().trim();
      }
      
      if (description) {
        metadata.description = description.substring(0, 500); // Limit length
      }
      
      // If no genres found, assign a default genre based on common patterns
      if (metadata.genres.length === 0) {
        const titleLower = metadata.title.toLowerCase();
        if (titleLower.includes('war') || titleLower.includes('battle')) {
          metadata.genres = ['War'];
        } else if (titleLower.includes('love') || titleLower.includes('romance')) {
          metadata.genres = ['Romance'];
        } else if (titleLower.includes('star') || titleLower.includes('space') || titleLower.includes('future')) {
          metadata.genres = ['Science Fiction'];
        } else if (titleLower.includes('horror') || titleLower.includes('terror')) {
          metadata.genres = ['Horror'];
        } else {
          // Default fallback genre
          metadata.genres = ['Drama'];
        }
      }
      
      // Additional debugging
      console.log(`[CATALOG] Extracted metadata for ${lddbUrl}:`);
      console.log(`[CATALOG] - Title: ${metadata.title}`);
      console.log(`[CATALOG] - Country: ${metadata.country}`);
      console.log(`[CATALOG] - Year: ${metadata.year}`);
      console.log(`[CATALOG] - Cover: ${metadata.coverUrl}`);
      console.log(`[CATALOG] - Director: ${metadata.director}`);
      console.log(`[CATALOG] - Actors: ${metadata.actors.join(', ')}`);
      console.log(`[CATALOG] - Genres: ${metadata.genres.join(', ')}`);
      
      return {
        status: 'success',
        data: {
          ...metadata,
          format: 'LaserDisc' // Default format for LDDB catalog lookups
        }
      };
    } catch (error) {
      console.error(`[CATALOG] Error scraping LDDB page:`, error);
      return null;
    }
  }

  /**
   * Lookup catalog number and return metadata
   */
  static async lookupCatalogNumber(catalogNumber: string): Promise<CatalogLookupResult> {
    try {
      if (!catalogNumber?.trim()) {
        return {
          status: 'error',
          message: 'Missing catalog number'
        };
      }

      console.log(`[CATALOG] Looking up catalog number: ${catalogNumber}`);

      // Try direct LDDB search first (more reliable)
      let lddbUrl = await this.tryDirectLDDBSearch(catalogNumber);
      
      // If direct search fails, try Google search as fallback
      if (!lddbUrl) {
        console.log(`[CATALOG] Direct search failed, trying Google search...`);
        lddbUrl = await this.searchLDDBCatalogNumber(catalogNumber);
      }

      if (!lddbUrl) {
        return {
          status: 'not_found',
          message: `No LDDB results found for catalog number: ${catalogNumber}`
        };
      }

      // Scrape metadata
      const metadata = await this.scrapeLDDBMetadata(lddbUrl);
      if (!metadata) {
        return {
          status: 'error',
          message: 'Found LDDB page but could not extract metadata'
        };
      }

      return {
        status: 'success',
        data: metadata
      };
    } catch (error) {
      console.error(`[CATALOG] Error in lookupCatalogNumber:`, error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}