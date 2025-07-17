#!/usr/bin/env python3
"""
Catalog Number Lookup Service for YourFlix
Searches Google for catalog numbers on LDDB.com and scrapes movie metadata
"""
import re
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup
from urllib.parse import quote, unquote
import time

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the main app

def search_lddb_catalog_number(catalog_number):
    """Search Google for catalog number on LDDB.com"""
    try:
        query = f'"{catalog_number}" site:lddb.com'
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        google_search_url = f"https://www.google.com/search?q={quote(query)}"
        
        print(f"Searching Google for: {query}")
        response = requests.get(google_search_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for LDDB links in search results
        for link in soup.select("a[href]"):
            href = link.get("href", "")
            if "lddb.com" in href and "/laserdisc/" in href:
                # Clean Google redirect URL
                if href.startswith("/url?q="):
                    cleaned_url = href.split("&")[0].replace("/url?q=", "")
                    cleaned_url = unquote(cleaned_url)
                elif href.startswith("https://www.lddb.com"):
                    cleaned_url = href
                else:
                    continue
                    
                print(f"Found LDDB URL: {cleaned_url}")
                return cleaned_url
                
        return None
        
    except Exception as e:
        print(f"Error searching Google: {e}")
        return None

def scrape_lddb_metadata(lddb_url):
    """Scrape movie metadata from LDDB page"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        print(f"Scraping LDDB page: {lddb_url}")
        response = requests.get(lddb_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        metadata = {
            "title": "Unknown Title",
            "year": None,
            "runtime": None,
            "format": "LaserDisc",
            "genres": [],
            "coverUrl": None,
            "director": None,
            "cast": [],
            "description": None,
            "catalogNumber": None,
            "sourceUrl": lddb_url
        }
        
        # Extract title from page title or h1
        title_element = soup.find("title")
        if title_element:
            title_text = title_element.text.strip()
            # Remove " [LaserDisc]" or similar suffixes
            title_match = re.match(r"(.+?)\s*\[", title_text)
            if title_match:
                metadata["title"] = title_match.group(1).strip()
            else:
                metadata["title"] = title_text.split(" - ")[0].strip()
        
        # Look for h1 title as backup
        h1_element = soup.find("h1")
        if h1_element and metadata["title"] == "Unknown Title":
            metadata["title"] = h1_element.text.strip()
        
        # Extract year from title or metadata
        year_match = re.search(r"\((\d{4})\)", str(soup))
        if year_match:
            metadata["year"] = int(year_match.group(1))
        
        # Look for cover image
        cover_img = soup.find("img", {"src": lambda x: x and ("cover" in x.lower() or "poster" in x.lower())})
        if not cover_img:
            # Try any image with reasonable dimensions
            cover_img = soup.find("img", {"width": lambda x: x and int(x) > 100}) if soup.find("img", {"width": True}) else None
        
        if cover_img:
            cover_src = cover_img.get("src", "")
            if cover_src.startswith("/"):
                metadata["coverUrl"] = "https://www.lddb.com" + cover_src
            elif cover_src.startswith("http"):
                metadata["coverUrl"] = cover_src
        
        # Look for metadata table or description lists
        for dt in soup.find_all("dt"):
            dd = dt.find_next_sibling("dd")
            if dd:
                label = dt.text.strip().lower()
                value = dd.text.strip()
                
                if "director" in label:
                    metadata["director"] = value
                elif "genre" in label or "category" in label:
                    metadata["genres"] = [g.strip() for g in value.split(",")]
                elif "runtime" in label or "duration" in label:
                    runtime_match = re.search(r"(\d+)", value)
                    if runtime_match:
                        metadata["runtime"] = int(runtime_match.group(1))
                elif "catalog" in label or "number" in label:
                    metadata["catalogNumber"] = value
        
        # Look for cast information
        cast_elements = soup.find_all("a", href=lambda x: x and "/person/" in x)
        if cast_elements:
            metadata["cast"] = [elem.text.strip() for elem in cast_elements[:5]]  # Limit to first 5
        
        # Try to extract description
        description_elem = soup.find("div", class_=lambda x: x and "description" in x.lower())
        if not description_elem:
            description_elem = soup.find("p", string=lambda x: x and len(x) > 50)
        
        if description_elem:
            metadata["description"] = description_elem.text.strip()[:500]  # Limit length
        
        print(f"Extracted metadata: {metadata['title']} ({metadata['year']})")
        return metadata
        
    except Exception as e:
        print(f"Error scraping LDDB page: {e}")
        return None

def enhance_with_tmdb(title, year=None):
    """Enhance metadata with TMDb API data"""
    try:
        import os
        tmdb_api_key = os.environ.get('TMDB_API_KEY') or os.environ.get('VITE_TMDB_API_KEY')
        if not tmdb_api_key:
            print("TMDb API key not found, skipping enhancement")
            return None
        
        # Search TMDb for the movie
        search_url = f"https://api.themoviedb.org/3/search/movie?api_key={tmdb_api_key}&query={quote(title)}"
        if year:
            search_url += f"&year={year}"
        
        response = requests.get(search_url, timeout=10)
        response.raise_for_status()
        search_data = response.json()
        
        if not search_data.get('results'):
            print(f"No TMDb results for {title} ({year})")
            return None
        
        # Find best match
        best_match = search_data['results'][0]
        if year and len(search_data['results']) > 1:
            # Look for exact year match
            for result in search_data['results']:
                if result.get('release_date'):
                    result_year = int(result['release_date'][:4])
                    if result_year == year:
                        best_match = result
                        break
        
        # Get detailed movie data
        movie_id = best_match['id']
        details_url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={tmdb_api_key}&append_to_response=credits"
        
        response = requests.get(details_url, timeout=10)
        response.raise_for_status()
        details = response.json()
        
        # Extract enhanced data
        enhanced = {
            'tmdbId': movie_id,
            'description': details.get('overview', ''),
            'posterUrl': f"https://image.tmdb.org/t/p/w500{details['poster_path']}" if details.get('poster_path') else None,
            'runtime': details.get('runtime'),
            'genres': [g['name'] for g in details.get('genres', [])],
        }
        
        # Extract cast and crew
        credits = details.get('credits', {})
        if credits.get('crew'):
            director = next((c['name'] for c in credits['crew'] if c['job'] == 'Director'), None)
            if director:
                enhanced['director'] = director
        
        if credits.get('cast'):
            enhanced['actors'] = [c['name'] for c in credits['cast'][:10]]
        
        print(f"TMDb enhancement successful for {title}")
        return enhanced
        
    except Exception as e:
        print(f"TMDb enhancement failed: {e}")
        return None

@app.route("/lookup/catalog", methods=["POST"])
def lookup_catalog():
    """API endpoint for catalog number lookup"""
    try:
        data = request.get_json()
        catalog_number = data.get("catalog_number", "").strip()
        
        if not catalog_number:
            return jsonify({"error": "Missing catalog number"}), 400
        
        print(f"Looking up catalog number: {catalog_number}")
        
        # Search for LDDB URL
        lddb_url = search_lddb_catalog_number(catalog_number)
        if not lddb_url:
            return jsonify({
                "status": "not_found", 
                "message": f"No LDDB results found for catalog number: {catalog_number}"
            })
        
        # Scrape metadata
        metadata = scrape_lddb_metadata(lddb_url)
        if not metadata:
            return jsonify({
                "status": "error",
                "message": "Found LDDB page but could not extract metadata"
            })
        
        # Enhance with TMDb data if we have title and year
        if metadata.get('title') and metadata.get('year'):
            try:
                enhanced_metadata = enhance_with_tmdb(metadata['title'], metadata.get('year'))
                if enhanced_metadata:
                    # Keep LDDB core data but prioritize TMDb for description and poster
                    metadata.update({
                        'description': enhanced_metadata.get('description', metadata.get('description')),
                        # Always prioritize TMDb poster over LDDB cover
                        'posterUrl': enhanced_metadata.get('posterUrl') or metadata.get('coverUrl'),
                        'tmdbId': enhanced_metadata.get('tmdbId'),
                        'director': enhanced_metadata.get('director', metadata.get('director')),
                        'actors': enhanced_metadata.get('actors', metadata.get('cast', [])),
                        'genres': enhanced_metadata.get('genres', metadata.get('genres', [])),
                        'runtime': enhanced_metadata.get('runtime', metadata.get('runtime'))
                    })
                    print(f"Enhanced {metadata['title']} with TMDb data")
            except Exception as e:
                print(f"TMDb enhancement failed, using LDDB data only: {e}")
        
        return jsonify({
            "status": "success",
            "data": metadata,
            "catalog_number": catalog_number
        })
        
    except Exception as e:
        print(f"Error in lookup_catalog: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "catalog_lookup"})

if __name__ == "__main__":
    print("Starting Catalog Lookup Service on port 5001...")
    app.run(debug=True, port=5001, host="0.0.0.0")