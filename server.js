import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import mockupRoutes from './routes/mockupRoutes.js';

// Import utilities
import { setupDirectories, validateEnvironment } from './utils/setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5002;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'http://localhost:5001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5000',
        'https://yourdomain.com', // Add your production domain
        'https://www.yourdomain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Note: Static file serving removed - images are returned directly in responses

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/mockup', mockupRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Mockup Generator API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            mockup: '/api/mockup',
            documentation: '/api/mockup/docs'
        },
        status: 'running'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /health',
            'GET /',
            'POST /api/mockup/generate',
            'GET /api/mockup/products',
            'GET /api/mockup/docs'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Initialize server
async function startServer() {
    try {
        // Validate environment and setup directories
        await validateEnvironment();
        await setupDirectories();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`
🚀 Mockup Generator API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/api/mockup/docs
📁 Mockups: http://localhost:${PORT}/mockups/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();

export default app;
