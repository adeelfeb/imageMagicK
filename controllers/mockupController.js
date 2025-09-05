import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import generateMockupFromImage, { listAvailableProducts, checkProductStatus } from '../create_mockup.js';
import { processArtworkForAllProducts, processArtworkForProduct } from '../mockup_processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc Get list of available products
 * @route GET /api/mockup/products
 */
export const getProducts = async (req, res) => {
    try {
        const products = listAvailableProducts();
        const productsWithStatus = products.map(product => {
            const status = checkProductStatus(product);
            return {
                name: product,
                ready: status.isReady,
                hasBaseImages: status.hasBaseImages,
                hasMaps: status.hasMaps,
                status: status.isReady ? 'ready' : (status.hasBaseImages ? 'missing_maps' : 'missing_base_images')
            };
        });
        
        res.json({
            success: true,
            count: products.length,
            products: productsWithStatus
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get products',
            message: error.message
        });
    }
};

/**
 * @desc Get status of specific product
 * @route GET /api/mockup/products/:product/status
 */
export const getProductStatus = async (req, res) => {
    try {
        const { product } = req.params;
        const status = checkProductStatus(product);
        
        res.json({
            success: true,
            product: product,
            ready: status.isReady,
            hasBaseImages: status.hasBaseImages,
            hasMaps: status.hasMaps,
            status: status.isReady ? 'ready' : (status.hasBaseImages ? 'missing_maps' : 'missing_base_images'),
            message: status.isReady ? 'Product is ready for mockup generation' : 
                     (status.hasBaseImages ? 'Missing maps - run ./create_maps.sh ' + product : 'Missing base images')
        });
    } catch (error) {
        console.error('Error getting product status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get product status',
            message: error.message
        });
    }
};

/**
 * @desc Generate mockup for specific product
 * @route POST /api/mockup/generate/:product
 */
export const generateMockup = async (req, res) => {
    try {
        const { product } = req.params;
        const { useDynamic = false, useTiling = true } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No artwork file provided',
                message: 'Please upload an image file using the "artwork" field'
            });
        }
        
        console.log(`Generating mockup for ${product} with file: ${req.file.filename}`);
        
        // Generate mockup using the uploaded file
        const mockupBuffer = await generateMockupFromImage(req.file.path, product, {
            useDynamic,
            useTiling
        });
        
        // Clean up uploaded file immediately
        fs.unlinkSync(req.file.path);
        
        // Set response headers for image
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': mockupBuffer.length,
            'Content-Disposition': `inline; filename="${product}_mockup.jpg"`,
            'X-Product': product,
            'X-Size': mockupBuffer.length.toString(),
            'X-Options': JSON.stringify({ useDynamic, useTiling })
        });
        
        // Send the image buffer directly
        res.send(mockupBuffer);
        
    } catch (error) {
        console.error('Error generating mockup:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to generate mockup',
            message: error.message
        });
    }
};

/**
 * @desc Generate mockups for all available products
 * @route POST /api/mockup/generate
 */
export const generateAllMockups = async (req, res) => {
    try {
        const { useDynamic = false, useTiling = true } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No artwork file provided',
                message: 'Please upload an image file using the "artwork" field'
            });
        }
        
        console.log(`Generating mockups for all products with file: ${req.file.filename}`);
        
        // Generate mockups for all products and collect buffers
        const products = listAvailableProducts();
        const results = {};
        const mockupBuffers = {};
        
        for (const product of products) {
            try {
                const status = checkProductStatus(product);
                if (!status.isReady) {
                    results[product] = {
                        success: false,
                        error: status.hasBaseImages ? 'Missing maps' : 'Missing base images'
                    };
                    continue;
                }
                
                const mockupBuffer = await generateMockupFromImage(req.file.path, product, {
                    useDynamic,
                    useTiling
                });
                
                mockupBuffers[product] = mockupBuffer;
                results[product] = {
                    success: true,
                    size: mockupBuffer.length,
                    product: product
                };
                
            } catch (error) {
                results[product] = {
                    success: false,
                    error: error.message,
                    product: product
                };
            }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        // Set response headers for JSON with base64 images
        res.set({
            'Content-Type': 'application/json',
            'X-Total-Products': products.length.toString(),
            'X-Successful': Object.values(results).filter(r => r.success).length.toString()
        });
        
        // Convert buffers to base64 and include in response
        const responseData = {
            success: true,
            results: results,
            mockups: {},
            options: {
                useDynamic,
                useTiling
            }
        };
        
        // Add base64 encoded images to response
        for (const [product, buffer] of Object.entries(mockupBuffers)) {
            responseData.mockups[product] = {
                data: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                size: buffer.length,
                product: product
            };
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('Error generating all mockups:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to generate mockups',
            message: error.message
        });
    }
};

/**
 * @desc Generate mockup from base64 image for specific product
 * @route POST /api/mockup/generate-base64/:product
 */
export const generateMockupFromBase64 = async (req, res) => {
    try {
        const { product } = req.params;
        const { imageData, useDynamic = false, useTiling = true } = req.body;
        
        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'No image data provided',
                message: 'Please provide base64 image data in the "imageData" field'
            });
        }
        
        console.log(`Generating mockup for ${product} from base64 data`);
        
        // Generate mockup using base64 data
        const mockupBuffer = await generateMockupFromImage(imageData, product, {
            useDynamic,
            useTiling
        });
        
        // Set response headers for image
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': mockupBuffer.length,
            'Content-Disposition': `inline; filename="${product}_mockup.jpg"`,
            'X-Product': product,
            'X-Size': mockupBuffer.length.toString(),
            'X-Options': JSON.stringify({ useDynamic, useTiling })
        });
        
        // Send the image buffer directly
        res.send(mockupBuffer);
        
    } catch (error) {
        console.error('Error generating mockup from base64:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate mockup',
            message: error.message
        });
    }
};

/**
 * @desc Generate mockups from base64 image for all products
 * @route POST /api/mockup/generate-base64
 */
export const generateAllMockupsFromBase64 = async (req, res) => {
    try {
        const { imageData, useDynamic = false, useTiling = true } = req.body;
        
        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'No image data provided',
                message: 'Please provide base64 image data in the "imageData" field'
            });
        }
        
        console.log('Generating mockups for all products from base64 data');
        
        // Generate mockups for all products and collect buffers
        const products = listAvailableProducts();
        const results = {};
        const mockupBuffers = {};
        
        for (const product of products) {
            try {
                const status = checkProductStatus(product);
                if (!status.isReady) {
                    results[product] = {
                        success: false,
                        error: status.hasBaseImages ? 'Missing maps' : 'Missing base images'
                    };
                    continue;
                }
                
                const mockupBuffer = await generateMockupFromImage(imageData, product, {
                    useDynamic,
                    useTiling
                });
                
                mockupBuffers[product] = mockupBuffer;
                results[product] = {
                    success: true,
                    size: mockupBuffer.length,
                    product: product
                };
                
            } catch (error) {
                results[product] = {
                    success: false,
                    error: error.message,
                    product: product
                };
            }
        }
        
        // Set response headers for JSON with base64 images
        res.set({
            'Content-Type': 'application/json',
            'X-Total-Products': products.length.toString(),
            'X-Successful': Object.values(results).filter(r => r.success).length.toString()
        });
        
        // Convert buffers to base64 and include in response
        const responseData = {
            success: true,
            results: results,
            mockups: {},
            options: {
                useDynamic,
                useTiling
            }
        };
        
        // Add base64 encoded images to response
        for (const [product, buffer] of Object.entries(mockupBuffers)) {
            responseData.mockups[product] = {
                data: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                size: buffer.length,
                product: product
            };
        }
        
        res.json(responseData);
        
    } catch (error) {
        console.error('Error generating all mockups from base64:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate mockups',
            message: error.message
        });
    }
};

/**
 * @desc Health check for mockup service
 * @route GET /api/mockup/health
 */
export const healthCheck = async (req, res) => {
    try {
        const products = listAvailableProducts();
        const readyProducts = products.filter(product => checkProductStatus(product).isReady);
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            products: {
                total: products.length,
                ready: readyProducts.length,
                list: products
            },
            services: {
                imagemagick: 'available',
                mockupGenerator: 'running'
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
};

/**
 * Get next available output filename in directory
 */
function getNextOutputFile(directory, prefix = 'output') {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    
    const files = fs.readdirSync(directory);
    let index = 0;
    let filename = `${prefix}.jpg`;
    
    while (files.includes(filename)) {
        index++;
        filename = `${prefix}${index}.jpg`;
    }
    
    return path.join(directory, filename);
}
