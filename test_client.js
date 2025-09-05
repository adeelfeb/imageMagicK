import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5002/api/mockup';

/**
 * Test client for the Mockup Generator API
 */
class MockupAPIClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }
    
    /**
     * Test API health
     */
    async testHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            console.log('🏥 Health Check:', data);
            return data;
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            return null;
        }
    }
    
    /**
     * Get available products
     */
    async getProducts() {
        try {
            const response = await fetch(`${this.baseUrl}/products`);
            const data = await response.json();
            console.log('📦 Available Products:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to get products:', error.message);
            return null;
        }
    }
    
    /**
     * Generate mockup for specific product using file upload
     */
    async generateMockupFromFile(product, imagePath, options = {}) {
        try {
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }
            
            const formData = new FormData();
            formData.append('artwork', fs.createReadStream(imagePath));
            formData.append('useDynamic', options.useDynamic || false);
            formData.append('useTiling', options.useTiling !== false);
            
            const response = await fetch(`${this.baseUrl}/generate/${product}`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Generated mockup for ${product}:`, data);
            } else {
                console.error(`❌ Failed to generate mockup for ${product}:`, data);
            }
            
            return data;
        } catch (error) {
            console.error(`❌ Error generating mockup for ${product}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate mockup for all products using file upload
     */
    async generateAllMockupsFromFile(imagePath, options = {}) {
        try {
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }
            
            const formData = new FormData();
            formData.append('artwork', fs.createReadStream(imagePath));
            formData.append('useDynamic', options.useDynamic || false);
            formData.append('useTiling', options.useTiling !== false);
            
            const response = await fetch(`${this.baseUrl}/generate`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Generated mockups for all products:', data);
            } else {
                console.error('❌ Failed to generate mockups:', data);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Error generating all mockups:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate mockup from base64 image
     */
    async generateMockupFromBase64(product, base64Image, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/generate-base64/${product}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imageData: base64Image,
                    useDynamic: options.useDynamic || false,
                    useTiling: options.useTiling !== false
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ Generated mockup from base64 for ${product}:`, data);
            } else {
                console.error(`❌ Failed to generate mockup from base64 for ${product}:`, data);
            }
            
            return data;
        } catch (error) {
            console.error(`❌ Error generating mockup from base64 for ${product}:`, error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get product status
     */
    async getProductStatus(product) {
        try {
            const response = await fetch(`${this.baseUrl}/products/${product}/status`);
            const data = await response.json();
            console.log(`📊 Status for ${product}:`, data);
            return data;
        } catch (error) {
            console.error(`❌ Failed to get status for ${product}:`, error.message);
            return null;
        }
    }
}

/**
 * Run test examples
 */
async function runTests() {
    console.log('🧪 Starting Mockup API Tests\n');
    
    const client = new MockupAPIClient();
    
    // Test 1: Health check
    console.log('=== Test 1: Health Check ===');
    await client.testHealth();
    console.log('');
    
    // Test 2: Get products
    console.log('=== Test 2: Get Products ===');
    const products = await client.getProducts();
    console.log('');
    
    if (products && products.success) {
        // Test 3: Check product status
        console.log('=== Test 3: Product Status ===');
        for (const product of products.products) {
            await client.getProductStatus(product.name);
        }
        console.log('');
        
        // Test 4: Generate mockup from file (if artwork exists)
        console.log('=== Test 4: Generate Mockup from File ===');
        const artworkFiles = [
            'swatches/art1.jpg',
            'swatches/art2.jpg',
            'swatches/art6.jpg'
        ];
        
        for (const artworkFile of artworkFiles) {
            if (fs.existsSync(artworkFile)) {
                console.log(`Testing with ${artworkFile}:`);
                await client.generateMockupFromFile('tshirt', artworkFile, {
                    useDynamic: false,
                    useTiling: true
                });
                break; // Only test with first available file
            }
        }
        console.log('');
        
        // Test 5: Generate all mockups (if artwork exists)
        console.log('=== Test 5: Generate All Mockups ===');
        for (const artworkFile of artworkFiles) {
            if (fs.existsSync(artworkFile)) {
                console.log(`Testing with ${artworkFile}:`);
                await client.generateAllMockupsFromFile(artworkFile, {
                    useDynamic: false,
                    useTiling: true
                });
                break; // Only test with first available file
            }
        }
    }
    
    console.log('🏁 Tests completed');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export default MockupAPIClient;
