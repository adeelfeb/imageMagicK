import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5002/api/mockup';

/**
 * Test script to demonstrate image response functionality
 */
async function testImageResponses() {
    console.log('🧪 Testing Image Response API\n');
    
    try {
        // Test 1: Single product - should return image directly
        console.log('=== Test 1: Single Product (Direct Image) ===');
        const imagePath = 'swatches/art1.jpg';
        
        if (!fs.existsSync(imagePath)) {
            console.log('⚠️  Artwork file not found, skipping image tests');
            return;
        }
        
        const formData = new FormData();
        formData.append('artwork', fs.createReadStream(imagePath));
        
        const response = await fetch(`${API_BASE_URL}/generate/tshirt`, {
            method: 'POST',
            body: formData
        });
        
        console.log('Response Headers:');
        console.log('  Content-Type:', response.headers.get('content-type'));
        console.log('  X-Product:', response.headers.get('x-product'));
        console.log('  X-Size:', response.headers.get('x-size'));
        console.log('  X-Options:', response.headers.get('x-options'));
        
        if (response.headers.get('content-type')?.includes('image/jpeg')) {
            const imageBuffer = await response.buffer();
            console.log(`✅ Received image buffer: ${imageBuffer.length} bytes`);
            
            // Save the received image for verification
            fs.writeFileSync('test_output_tshirt.jpg', imageBuffer);
            console.log('💾 Saved as: test_output_tshirt.jpg');
        } else {
            const text = await response.text();
            console.log('❌ Unexpected response:', text);
        }
        
        console.log('');
        
        // Test 2: All products - should return JSON with base64 images
        console.log('=== Test 2: All Products (JSON with Base64) ===');
        
        const formData2 = new FormData();
        formData2.append('artwork', fs.createReadStream(imagePath));
        
        const response2 = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            body: formData2
        });
        
        console.log('Response Headers:');
        console.log('  Content-Type:', response2.headers.get('content-type'));
        console.log('  X-Total-Products:', response2.headers.get('x-total-products'));
        console.log('  X-Successful:', response2.headers.get('x-successful'));
        
        const jsonResponse = await response2.json();
        
        if (jsonResponse.success) {
            console.log('✅ Received JSON response with mockups');
            console.log(`📊 Total products: ${Object.keys(jsonResponse.results).length}`);
            console.log(`✅ Successful: ${Object.keys(jsonResponse.mockups).length}`);
            
            // Save each mockup image
            for (const [product, mockup] of Object.entries(jsonResponse.mockups)) {
                if (mockup.data) {
                    // Extract base64 data
                    const base64Data = mockup.data.split(',')[1];
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    
                    const filename = `test_output_${product}.jpg`;
                    fs.writeFileSync(filename, imageBuffer);
                    console.log(`💾 Saved ${product}: ${filename} (${imageBuffer.length} bytes)`);
                }
            }
        } else {
            console.log('❌ Failed to generate mockups:', jsonResponse);
        }
        
        console.log('\n=== Test 3: Base64 Input (Direct Image) ===');
        
        // Test base64 input
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
        
        const response3 = await fetch(`${API_BASE_URL}/generate-base64/mobile_cover`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageData: base64Image,
                useDynamic: false,
                useTiling: true
            })
        });
        
        console.log('Response Headers:');
        console.log('  Content-Type:', response3.headers.get('content-type'));
        console.log('  X-Product:', response3.headers.get('x-product'));
        console.log('  X-Size:', response3.headers.get('x-size'));
        
        if (response3.headers.get('content-type')?.includes('image/jpeg')) {
            const imageBuffer3 = await response3.buffer();
            console.log(`✅ Received image buffer: ${imageBuffer3.length} bytes`);
            
            fs.writeFileSync('test_output_mobile_base64.jpg', imageBuffer3);
            console.log('💾 Saved as: test_output_mobile_base64.jpg');
        } else {
            const text = await response3.text();
            console.log('❌ Unexpected response:', text);
        }
        
        console.log('\n🎉 All tests completed!');
        console.log('\nGenerated files:');
        console.log('  - test_output_tshirt.jpg (direct image response)');
        console.log('  - test_output_*.jpg (from all products response)');
        console.log('  - test_output_mobile_base64.jpg (base64 input)');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testImageResponses();
}

export { testImageResponses };

