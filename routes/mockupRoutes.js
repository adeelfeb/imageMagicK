import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateProductName, getProductStatus } from '../utils/setup.js';
import { listAvailableProducts } from '../create_mockup.js';
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
        files: 1 // Only one file at a time
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
            'GET /docs': 'This documentation'
        },
        examples: {
            'List products': 'GET /api/mockup/products',
            'Generate t-shirt mockup': 'POST /api/mockup/generate/tshirt',
            'Generate all mockups': 'POST /api/mockup/generate'
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
router.post('/generate/:product', validateProduct, upload.single('artwork'), mockupController.generateMockup);

/**
 * @route POST /api/mockup/generate
 * @desc Generate mockups for all available products
 */
router.post('/generate', upload.single('artwork'), mockupController.generateAllMockups);

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

export default router;
