import generateMockupFromImage from './create_mockup.js';
import fs from 'fs';
import path from 'path';

/**
 * Example usage of the generateMockupFromImage function
 */

async function exampleUsage() {
    try {
        console.log('=== Mockup Generator Example Usage ===\n');
        
        // Example 1: Process image from file path
        console.log('1. Processing image from file path...');
        const imagePath = 'swatches/art1.jpg';
        
        if (fs.existsSync(imagePath)) {
            const mockupBuffer = await generateMockupFromImage(imagePath, 'tshirt', {
                useDynamic: false,
                useTiling: true
            });
            
            // Save the result
            const outputPath = 'mockups/example_tshirt.jpg';
            fs.writeFileSync(outputPath, mockupBuffer);
            console.log(`✅ T-shirt mockup saved: ${outputPath}`);
        } else {
            console.log('⚠️  Artwork file not found, skipping example 1');
        }
        
        // Example 2: Process image from buffer
        console.log('\n2. Processing image from buffer...');
        const imagePath2 = 'swatches/art2.jpg';
        
        if (fs.existsSync(imagePath2)) {
            const imageBuffer = fs.readFileSync(imagePath2);
            const mockupBuffer = await generateMockupFromImage(imageBuffer, 'mobile_cover', {
                useDynamic: true,
                useTiling: false
            });
            
            // Save the result
            const outputPath2 = 'mockups/example_mobile.jpg';
            fs.writeFileSync(outputPath2, mockupBuffer);
            console.log(`✅ Mobile cover mockup saved: ${outputPath2}`);
        } else {
            console.log('⚠️  Artwork file not found, skipping example 2');
        }
        
        // Example 3: Process multiple products with same artwork
        console.log('\n3. Processing same artwork for multiple products...');
        const imagePath3 = 'swatches/art6.jpg';
        
        if (fs.existsSync(imagePath3)) {
            const products = ['curtain', 'tshirt', 'mobile_cover'];
            
            for (const product of products) {
                try {
                    const mockupBuffer = await generateMockupFromImage(imagePath3, product, {
                        useDynamic: false,
                        useTiling: true
                    });
                    
                    const outputPath = `mockups/example_${product}.jpg`;
                    fs.writeFileSync(outputPath, mockupBuffer);
                    console.log(`✅ ${product} mockup saved: ${outputPath}`);
                } catch (error) {
                    console.log(`⚠️  Skipping ${product}: ${error.message}`);
                }
            }
        } else {
            console.log('⚠️  Artwork file not found, skipping example 3');
        }
        
        // Example 4: Process with base64 string (simulated)
        console.log('\n4. Processing base64 image...');
        try {
            // Read an image and convert to base64 for demonstration
            const imagePath4 = 'swatches/art9.jpg';
            if (fs.existsSync(imagePath4)) {
                const imageBuffer = fs.readFileSync(imagePath4);
                const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
                
                const mockupBuffer = await generateMockupFromImage(base64Image, 'curtain', {
                    useDynamic: false,
                    useTiling: true
                });
                
                const outputPath4 = 'mockups/example_curtain_base64.jpg';
                fs.writeFileSync(outputPath4, mockupBuffer);
                console.log(`✅ Curtain mockup (base64) saved: ${outputPath4}`);
            } else {
                console.log('⚠️  Artwork file not found, skipping example 4');
            }
        } catch (error) {
            console.log(`⚠️  Base64 processing error: ${error.message}`);
        }
        
        console.log('\n=== All examples completed ===');
        
    } catch (error) {
        console.error('Example execution error:', error);
    }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    exampleUsage();
}

export { exampleUsage };
