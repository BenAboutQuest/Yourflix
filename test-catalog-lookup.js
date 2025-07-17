// Test the catalog lookup functionality directly
const { barcodeService } = require('./server/services/barcode');

async function testCatalogLookup() {
  console.log('Testing catalog lookup for PILF-0002...');
  
  try {
    const result = await barcodeService.lookupByCatalogNumber('PILF-0002');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\nTesting catalog lookup for DVD-0001...');
  
  try {
    const result = await barcodeService.lookupByCatalogNumber('DVD-0001');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testCatalogLookup();