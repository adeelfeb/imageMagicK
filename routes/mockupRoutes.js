import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateProductName, getProductStatus } from '../utils/setup.js';
import { listAvailableProducts } from '../src/create_mockup.js';
import * as mockupController from '../controllers/mockupController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `artwork-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files (JPEG, PNG, GIF, BMP, WebP) are allowed'));
        }
    }
});

// Custom error handler for multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many files',
                    message: 'Please upload only one image file at a time',
                    code: 'LIMIT_FILE_COUNT',
                    suggestion: 'Upload one image file using the "artwork" field'
                });
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    error: 'File too large',
                    message: 'File size exceeds the 50MB limit',
                    code: 'LIMIT_FILE_SIZE',
                    suggestion: 'Please compress your image or use a smaller file'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: 'Unexpected file field',
                    message: 'Please use the "artwork" field name for file uploads',
                    code: 'LIMIT_UNEXPECTED_FILE',
                    suggestion: 'Ensure your form uses the field name "artwork"'
                });
            case 'LIMIT_PART_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many parts',
                    message: 'Too many parts in the multipart form',
                    code: 'LIMIT_PART_COUNT',
                    suggestion: 'Simplify your form data'
                });
            case 'LIMIT_FIELD_KEY':
                return res.status(400).json({
                    success: false,
                    error: 'Field name too long',
                    message: 'Field name exceeds the maximum length',
                    code: 'LIMIT_FIELD_KEY',
                    suggestion: 'Use shorter field names'
                });
            case 'LIMIT_FIELD_VALUE':
                return res.status(400).json({
                    success: false,
                    error: 'Field value too long',
                    message: 'Field value exceeds the maximum length',
                    code: 'LIMIT_FIELD_VALUE',
                    suggestion: 'Reduce the size of your field values'
                });
            case 'LIMIT_FIELD_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many fields',
                    message: 'Too many fields in the form',
                    code: 'LIMIT_FIELD_COUNT',
                    suggestion: 'Reduce the number of form fields'
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: 'File upload error',
                    message: err.message,
                    code: err.code
                });
        }
    } else if (err.message === 'Only image files (JPEG, PNG, GIF, BMP, WebP) are allowed') {
        return res.status(400).json({
            success: false,
            error: 'Invalid file type',
            message: 'Only image files (JPEG, PNG, GIF, BMP, WebP) are allowed',
            suggestion: 'Please upload a valid image file'
        });
    }
    
    // Pass other errors to the next error handler
    next(err);
};

// Wrapper function to handle multer errors properly
const handleMulterUpload = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                return handleMulterError(err, req, res, next);
            }
            next();
        });
    };
};

// Middleware to validate product parameter
const validateProduct = (req, res, next) => {
    const { product } = req.params;
    
    if (!product) {
        return res.status(400).json({
            error: 'Product parameter is required',
            message: 'Please specify a product name in the URL path'
        });
    }
    
    const productStatus = getProductStatus(product);
    
    if (!productStatus.valid) {
        return res.status(400).json({
            error: 'Invalid product',
            message: productStatus.error,
            availableProducts: productStatus.availableProducts
        });
    }
    
    if (!productStatus.ready) {
        return res.status(400).json({
            error: 'Product not ready',
            message: productStatus.error,
            suggestion: 'Run ./create_maps.sh ' + product + ' to generate required maps'
        });
    }
    
    req.productStatus = productStatus;
    next();
};

// Routes

/**
 * @route GET /api/mockup/docs
 * @desc Get API documentation
 */
router.get('/docs', (req, res) => {
    res.json({
        title: 'Mockup Generator API',
        version: '1.0.0',
        description: 'API for generating product mockups from artwork images',
        endpoints: {
            'GET /products': 'List available products',
            'GET /products/:product/status': 'Get product status',
            'POST /generate/:product': 'Generate mockup for specific product',
            'POST /generate': 'Generate mockup for all products',
            'POST /generate-base64/:product': 'Generate mockup from base64 for specific product',
            'POST /generate-base64': 'Generate mockup from base64 for all products',
            'POST /clear-temp': 'Clear all temporary files',
            'GET /temp-status': 'Get temporary files status',
            'GET /test-image/:product': 'Test endpoint to return existing mockup image',
            'GET /test-image-base64/:product': 'Test endpoint to return existing mockup as base64 JSON',
            'GET /health': 'Health check',
            'GET /docs': 'This documentation'
        },
        examples: {
            'List products': 'GET /api/mockup/products',
            'Generate t-shirt mockup': 'POST /api/mockup/generate/tshirt',
            'Generate all mockups': 'POST /api/mockup/generate',
            'Clear temp files': 'POST /api/mockup/clear-temp',
            'Check temp status': 'GET /api/mockup/temp-status',
            'Test image (binary)': 'GET /api/mockup/test-image/tshirt',
            'Test image (base64)': 'GET /api/mockup/test-image-base64/tshirt'
        },
        supportedFormats: ['JPEG', 'PNG', 'GIF', 'BMP', 'WebP'],
        maxFileSize: '50MB'
    });
});

/**
 * @route GET /api/mockup/products
 * @desc Get list of available products
 */
router.get('/products', mockupController.getProducts);

/**
 * @route GET /api/mockup/products/:product/status
 * @desc Get status of specific product
 */
router.get('/products/:product/status', validateProduct, mockupController.getProductStatus);

/**
 * @route POST /api/mockup/generate/:product
 * @desc Generate mockup for specific product
 */
router.post('/generate/:product', validateProduct, handleMulterUpload(upload.single('artwork')), mockupController.generateMockup);

/**
 * @route POST /api/mockup/generate
 * @desc Generate mockups for all available products
 */
router.post('/generate', handleMulterUpload(upload.single('artwork')), mockupController.generateAllMockups);

/**
 * @route POST /api/mockup/generate-zip
 * @desc Generate mockups for all ready products and return as ZIP
 */
router.post('/generate-zip', handleMulterUpload(upload.single('artwork')), mockupController.generateAllMockupsZip);

/**
 * @route POST /api/mockup/create-product-and-generate
 * @desc Upload template, mask, and pattern-image, create folder and maps, then return mockup
 */
router.post(
    '/create-product-and-generate',
    handleMulterUpload(
        upload.fields([
            { name: 'template', maxCount: 1 },
            { name: 'mask', maxCount: 1 },
            { name: 'pattern-image', maxCount: 1 }
        ])
    ),
    mockupController.uploadBaseImagesAndGenerate
);

/**
 * @route POST /api/mockup/generate-base64/:product
 * @desc Generate mockup from base64 image for specific product
 */
router.post('/generate-base64/:product', validateProduct, mockupController.generateMockupFromBase64);

/**
 * @route POST /api/mockup/generate-base64
 * @desc Generate mockups from base64 image for all products
 */
router.post('/generate-base64', mockupController.generateAllMockupsFromBase64);

/**
 * @route GET /api/mockup/health
 * @desc Health check for mockup service
 */
router.get('/health', mockupController.healthCheck);

/**
 * @route POST /api/mockup/clear-temp
 * @desc Clear all temporary files from temp directory
 */
router.post('/clear-temp', mockupController.clearTempFiles);

/**
 * @route GET /api/mockup/temp-status
 * @desc Get status of temporary files in temp directory
 */
router.get('/temp-status', mockupController.getTempStatus);

/**
 * @route GET /api/mockup/test-image/:product
 * @desc Test endpoint to return a mockup image directly
 */
router.get('/test-image/:product', (req, res) => {
    try {
        const { product } = req.params;
        const imagePath = path.join(__dirname, '..', 'mockups', product, 'output.jpg');
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                error: 'Image not found',
                path: imagePath
            });
        }
        
        // Read the file as buffer
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Set proper headers for image response
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': imageBuffer.length,
            'Content-Disposition': `inline; filename="${product}_test.jpg"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Send the buffer directly
        res.end(imageBuffer);
        
    } catch (error) {
        console.error('Test image error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route GET /api/mockup/test-image-base64/:product
 * @desc Test endpoint to return a mockup image as base64 JSON
 */
router.get('/test-image-base64/:product', (req, res) => {
    try {
        const { product } = req.params;
        const imagePath = path.join(__dirname, '..', 'mockups', product, 'output.jpg');
        
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                success: false,
                error: 'Image not found',
                path: imagePath
            });
        }
        
        // Read the file as buffer
        const imageBuffer = fs.readFileSync(imagePath);
        
        // Convert to base64
        const base64Data = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Data}`;
        
        // Return as JSON
        res.json({
            success: true,
            product: product,
            image: {
                data: dataUrl,
                size: imageBuffer.length,
                format: 'jpeg'
            }
        });
        
    } catch (error) {
        console.error('Test image base64 error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
