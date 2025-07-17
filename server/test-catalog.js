// Quick test of catalog lookup functionality
import axios from 'axios';

async function testCatalogLookup(catalogNumber) {
  console.log(`Testing catalog lookup for: ${catalogNumber}`);
  
  try {
    // Test direct LDDB access first
    const lddbSearchUrl = `https://www.lddb.com/search.php?search=${encodeURIComponent(catalogNumber)}`;
    console.log(`Trying direct LDDB search: ${lddbSearchUrl}`);
    
    const response = await axios.get(lddbSearchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response size: ${response.data.length} characters`);
    
    // Check if we can see any references to the catalog number
    const hasReference = response.data.toLowerCase().includes(catalogNumber.toLowerCase());
    console.log(`Contains catalog reference: ${hasReference}`);
    
    // Look for laserdisc links
    const lddbMatches = response.data.match(/href="[^"]*\/laserdisc\/[^"]*"/g);
    console.log(`Found ${lddbMatches ? lddbMatches.length : 0} laserdisc links`);
    
    if (lddbMatches && lddbMatches.length > 0) {
      console.log('First few matches:', lddbMatches.slice(0, 3));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test with known catalog numbers
testCatalogLookup('PILF-1618');