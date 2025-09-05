import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listAvailableProducts, checkProductStatus } from '../create_mockup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate that the environment is properly set up
 */
export async function validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    const requiredDirs = [
        'base_images',
        'maps',
        'mockups',
        'swatches'
    ];
    
    const missingDirs = [];
    
    for (const dir of requiredDirs) {
        const dirPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(dirPath)) {
            missingDirs.push(dir);
        }
    }
    
    if (missingDirs.length > 0) {
        throw new Error(`Missing required directories: ${missingDirs.join(', ')}`);
    }
    
    // Check if ImageMagick is available
    try {
        const { execSync } = await import('child_process');
        execSync('convert -version', { stdio: 'pipe' });
        console.log('✅ ImageMagick is available');
    } catch (error) {
        throw new Error('ImageMagick is not installed or not in PATH');
    }
    
    // Check available products
    const products = listAvailableProducts();
    console.log(`📦 Found ${products.length} products:`, products);
    
    for (const product of products) {
        const status = checkProductStatus(product);
        if (!status.isReady) {
            console.warn(`⚠️  Product '${product}' is not ready: ${status.hasBaseImages ? 'Missing maps' : 'Missing base images'}`);
        } else {
            console.log(`✅ Product '${product}' is ready`);
        }
    }
    
    console.log('✅ Environment validation complete');
}

/**
 * Setup required directories
 */
export async function setupDirectories() {
    console.log('📁 Setting up directories...');
    
    const dirs = [
        'mockups',
        'uploads',
        'temp'
    ];
    
    for (const dir of dirs) {
        const dirPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    }
    
    // Create product-specific mockup directories
    const products = listAvailableProducts();
    for (const product of products) {
        const productDir = path.join(__dirname, '..', 'mockups', product);
        if (!fs.existsSync(productDir)) {
            fs.mkdirSync(productDir, { recursive: true });
            console.log(`📁 Created product directory: mockups/${product}`);
        }
    }
    
    console.log('✅ Directory setup complete');
}

/**
 * Get server configuration
 */
export function getServerConfig() {
    return {
        port: process.env.PORT || 5002,
        environment: process.env.NODE_ENV || 'development',
        corsOrigins: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5000',
            'http://localhost:5001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000'
        ],
        maxFileSize: '50mb',
        rateLimitWindow: 15 * 60 * 1000, // 15 minutes
        rateLimitMax: 100
    };
}

/**
 * Validate product name
 */
export function validateProductName(productName) {
    const products = listAvailableProducts();
    return products.includes(productName);
}

/**
 * Get product status
 */
export function getProductStatus(productName) {
    if (!validateProductName(productName)) {
        return {
            valid: false,
            error: `Product '${productName}' not found`,
            availableProducts: listAvailableProducts()
        };
    }
    
    const status = checkProductStatus(productName);
    return {
        valid: true,
        ready: status.isReady,
        hasBaseImages: status.hasBaseImages,
        hasMaps: status.hasMaps,
        error: status.isReady ? null : (status.hasBaseImages ? 'Missing maps' : 'Missing base images')
    };
}

