import generateMockupFromImage, { listAvailableProducts, checkProductStatus } from './create_mockup.js';
import fs from 'fs';
import path from 'path';

/**
 * Process artwork and generate mockups for all available products
 * @param {string|Buffer} imageInput - Image file path, buffer, or base64 string
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Results object with generated files
 */
async function processArtworkForAllProducts(imageInput, options = {}) {
    const {
        useDynamic = false,
        useTiling = true,
        outputDir = 'mockups',
        filenamePrefix = 'output'
    } = options;
    
    const results = {};
    const products = listAvailableProducts();
    
    console.log(`Processing artwork for ${products.length} products:`, products);
    
    for (const product of products) {
        try {
            console.log(`\n--- Processing ${product} ---`);
            
            // Check if product is ready
            const status = checkProductStatus(product);
            if (!status.isReady) {
                console.log(`⚠️  Skipping ${product}: ${status.hasBaseImages ? 'Missing maps' : 'Missing base images'}`);
                continue;
            }
            
            // Generate mockup
            const mockupBuffer = await generateMockupFromImage(imageInput, product, {
                useDynamic,
                useTiling
            });
            
            // Create product output directory
            const productOutputDir = path.join(outputDir, product);
            if (!fs.existsSync(productOutputDir)) {
                fs.mkdirSync(productOutputDir, { recursive: true });
            }
            
            // Generate unique filename
            const outputFile = getNextOutputFile(productOutputDir, filenamePrefix);
            
            // Save the mockup
            fs.writeFileSync(outputFile, mockupBuffer);
            
            results[product] = {
                success: true,
                outputFile: outputFile,
                size: mockupBuffer.length
            };
            
            console.log(`✅ Generated: ${outputFile}`);
            
        } catch (error) {
            console.error(`❌ Error processing ${product}:`, error.message);
            results[product] = {
                success: false,
                error: error.message
            };
        }
    }
    
    return results;
}

/**
 * Process artwork for specific product
 * @param {string|Buffer} imageInput - Image file path, buffer, or base64 string
 * @param {string} productName - Name of the product
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Result object with generated file info
 */
async function processArtworkForProduct(imageInput, productName, options = {}) {
    const {
        useDynamic = false,
        useTiling = true,
        outputDir = 'mockups',
        filenamePrefix = 'output'
    } = options;
    
    try {
        console.log(`Processing artwork for ${productName}...`);
        
        // Check if product is ready
        const status = checkProductStatus(productName);
        if (!status.isReady) {
            throw new Error(`Product ${productName} is not ready: ${status.hasBaseImages ? 'Missing maps' : 'Missing base images'}`);
        }
        
        // Generate mockup
        const mockupBuffer = await generateMockupFromImage(imageInput, productName, {
            useDynamic,
            useTiling
        });
        
        // Create product output directory
        const productOutputDir = path.join(outputDir, productName);
        if (!fs.existsSync(productOutputDir)) {
            fs.mkdirSync(productOutputDir, { recursive: true });
        }
        
        // Generate unique filename
        const outputFile = getNextOutputFile(productOutputDir, filenamePrefix);
        
        // Save the mockup
        fs.writeFileSync(outputFile, mockupBuffer);
        
        console.log(`✅ Generated: ${outputFile}`);
        
        return {
            success: true,
            outputFile: outputFile,
            size: mockupBuffer.length,
            product: productName
        };
        
    } catch (error) {
        console.error(`❌ Error processing ${productName}:`, error.message);
        return {
            success: false,
            error: error.message,
            product: productName
        };
    }
}

/**
 * Get next available output filename in directory
 * @param {string} directory - Output directory
 * @param {string} prefix - Filename prefix
 * @returns {string} - Full path to next output file
 */
function getNextOutputFile(directory, prefix = 'output') {
    const files = fs.readdirSync(directory);
    let index = 0;
    let filename = `${prefix}.jpg`;
    
    while (files.includes(filename)) {
        index++;
        filename = `${prefix}${index}.jpg`;
    }
    
    return path.join(directory, filename);
}

/**
 * Batch process multiple artwork files
 * @param {Array<string|Buffer>} imageInputs - Array of image inputs
 * @param {string|Array<string>} products - Product name(s) to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Results object with all generated files
 */
async function batchProcessArtwork(imageInputs, products = 'all', options = {}) {
    const results = {};
    const productList = products === 'all' ? listAvailableProducts() : 
                       Array.isArray(products) ? products : [products];
    
    console.log(`Batch processing ${imageInputs.length} artwork files for ${productList.length} products`);
    
    for (let i = 0; i < imageInputs.length; i++) {
        const imageInput = imageInputs[i];
        const batchPrefix = `batch_${i + 1}`;
        
        console.log(`\n=== Processing artwork ${i + 1}/${imageInputs.length} ===`);
        
        results[`artwork_${i + 1}`] = {};
        
        for (const product of productList) {
            try {
                const result = await processArtworkForProduct(imageInput, product, {
                    ...options,
                    filenamePrefix: batchPrefix
                });
                results[`artwork_${i + 1}`][product] = result;
            } catch (error) {
                results[`artwork_${i + 1}`][product] = {
                    success: false,
                    error: error.message
                };
            }
        }
    }
    
    return results;
}

// Export functions
export {
    processArtworkForAllProducts,
    processArtworkForProduct,
    batchProcessArtwork,
    getNextOutputFile
};

// CLI functionality
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
Mockup Processor - Process artwork images into product mockups

Usage:
  node mockup_processor.js <artwork_file> [options]
  node mockup_processor.js --batch <artwork_dir> [options]

Options:
  --product=<name>     Process for specific product only
  --dynamic           Use dynamic positioning
  --no-tile           Disable tiling
  --batch             Process all images in directory
  --output=<dir>      Output directory (default: mockups)
  --prefix=<name>     Output filename prefix (default: output)
  --list-products     List available products

Examples:
  node mockup_processor.js swatches/art1.jpg
  node mockup_processor.js swatches/art1.jpg --product=tshirt
  node mockup_processor.js --batch swatches/
  node mockup_processor.js swatches/art1.jpg --dynamic --no-tile
        `);
        process.exit(0);
    }
    
    if (args.includes('--list-products')) {
        const products = listAvailableProducts();
        console.log('Available products:');
        products.forEach(product => {
            const status = checkProductStatus(product);
            const statusText = status.isReady ? '✅ Ready' : 
                             status.hasBaseImages ? '⚠️  Missing maps' : '❌ Missing base images';
            console.log(`  - ${product} (${statusText})`);
        });
        process.exit(0);
    }
    
    const batchMode = args.includes('--batch');
    const productArg = args.find(arg => arg.startsWith('--product='));
    const productName = productArg ? productArg.split('=')[1] : null;
    const outputArg = args.find(arg => arg.startsWith('--output='));
    const outputDir = outputArg ? outputArg.split('=')[1] : 'mockups';
    const prefixArg = args.find(arg => arg.startsWith('--prefix='));
    const filenamePrefix = prefixArg ? prefixArg.split('=')[1] : 'output';
    
    const useDynamic = args.includes('--dynamic');
    const disableTiling = args.includes('--no-tile');
    const useTiling = !disableTiling;
    
    const options = {
        useDynamic,
        useTiling,
        outputDir,
        filenamePrefix
    };
    
    if (batchMode) {
        const artworkDir = args.find(arg => !arg.startsWith('--'));
        if (!artworkDir || !fs.existsSync(artworkDir)) {
            console.error('Error: Please provide a valid artwork directory for batch processing');
            process.exit(1);
        }
        
        const imageFiles = fs.readdirSync(artworkDir)
            .filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file))
            .map(file => path.join(artworkDir, file));
        
        if (imageFiles.length === 0) {
            console.error('Error: No image files found in directory');
            process.exit(1);
        }
        
        console.log(`Found ${imageFiles.length} image files for batch processing`);
        
        batchProcessArtwork(imageFiles, productName || 'all', options)
            .then(results => {
                console.log('\n=== Batch Processing Complete ===');
                console.log(JSON.stringify(results, null, 2));
            })
            .catch(error => {
                console.error('Batch processing error:', error);
                process.exit(1);
            });
    } else {
        const artworkFile = args.find(arg => !arg.startsWith('--'));
        if (!artworkFile || !fs.existsSync(artworkFile)) {
            console.error('Error: Please provide a valid artwork file');
            process.exit(1);
        }
        
        if (productName) {
            processArtworkForProduct(artworkFile, productName, options)
                .then(result => {
                    console.log('\n=== Processing Complete ===');
                    console.log(JSON.stringify(result, null, 2));
                })
                .catch(error => {
                    console.error('Processing error:', error);
                    process.exit(1);
                });
        } else {
            processArtworkForAllProducts(artworkFile, options)
                .then(results => {
                    console.log('\n=== Processing Complete ===');
                    console.log(JSON.stringify(results, null, 2));
                })
                .catch(error => {
                    console.error('Processing error:', error);
                    process.exit(1);
                });
        }
    }
}
