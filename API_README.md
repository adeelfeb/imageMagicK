# 🎨 Mockup Generator API Server

A complete Express.js API server for generating product mockups from artwork images. The server provides RESTful endpoints to process images and generate mockups for various products like t-shirts, mobile covers, curtains, and more.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Required Maps
```bash
# Generate maps for all products
./create_maps.sh

# Or generate maps for specific product
./create_maps.sh tshirt
```

### 3. Start the Server
```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

The server will start on `http://localhost:5002`

## 📡 API Endpoints

### Health & Status
- `GET /health` - Server health check
- `GET /api/mockup/health` - Mockup service health check
- `GET /api/mockup/products` - List available products
- `GET /api/mockup/products/:product/status` - Get product status

### Mockup Generation
- `POST /api/mockup/generate/:product` - Generate mockup for specific product
- `POST /api/mockup/generate` - Generate mockups for all products
- `POST /api/mockup/generate-base64/:product` - Generate from base64 image
- `POST /api/mockup/generate-base64` - Generate all from base64 image

### Documentation
- `GET /api/mockup/docs` - API documentation

## 🔧 Usage Examples

### 1. List Available Products
```bash
curl http://localhost:5002/api/mockup/products
```

### 2. Generate T-shirt Mockup
```bash
curl -X POST \
  -F "artwork=@swatches/art1.jpg" \
  -F "useDynamic=false" \
  -F "useTiling=true" \
  http://localhost:5002/api/mockup/generate/tshirt
```

### 3. Generate All Mockups
```bash
curl -X POST \
  -F "artwork=@swatches/art1.jpg" \
  -F "useDynamic=false" \
  -F "useTiling=true" \
  http://localhost:5002/api/mockup/generate
```

### 4. Generate from Base64
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
    "useDynamic": false,
    "useTiling": true
  }' \
  http://localhost:5002/api/mockup/generate-base64/tshirt
```

## 📁 Project Structure

```
mockup/
├── server.js                 # Main server file
├── create_mockup.js          # Core mockup generation logic
├── mockup_processor.js       # File processing utilities
├── test_client.js           # API test client
├── routes/
│   └── mockupRoutes.js      # API routes
├── controllers/
│   └── mockupController.js  # Request handlers
├── utils/
│   └── setup.js            # Environment setup utilities
├── base_images/            # Product templates and masks
├── maps/                   # Generated displacement/lighting maps
├── mockups/               # Generated mockup outputs
└── swatches/              # Sample artwork files
```

## 🎯 Features

### ✅ Core Functionality
- **Multiple Product Support**: T-shirt, mobile cover, curtain, mug, hoodie
- **Flexible Input**: File upload, base64 images, image buffers
- **Smart Scaling**: Automatic artwork scaling to fit mask dimensions
- **Tiling Support**: Pattern tiling across large surfaces
- **Dynamic Positioning**: Advanced positioning algorithms

### ✅ API Features
- **RESTful Design**: Clean, intuitive API endpoints
- **CORS Support**: Cross-origin requests enabled
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Validation**: Image type and size validation
- **Error Handling**: Comprehensive error responses
- **Health Monitoring**: Service health checks

### ✅ Security & Performance
- **Helmet.js**: Security headers
- **Input Validation**: File type and size limits
- **Temporary File Cleanup**: Automatic cleanup of temp files
- **Memory Management**: Efficient buffer handling

## 🔧 Configuration

### Environment Variables
```bash
PORT=5002                    # Server port
NODE_ENV=development         # Environment mode
```

### CORS Origins
The server is configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5000`
- `http://localhost:5001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5000`

Add your production domains to the CORS configuration in `server.js`.

## 📊 Response Format

### Single Product Response (Image)
- **Content-Type**: `image/jpeg`
- **Response**: Direct image binary data
- **Headers**:
  - `X-Product`: Product name
  - `X-Size`: Image size in bytes
  - `X-Options`: JSON string of options used

### All Products Response (JSON with Base64 Images)
```json
{
  "success": true,
  "results": {
    "tshirt": {
      "success": true,
      "size": 245760,
      "product": "tshirt"
    },
    "mobile_cover": {
      "success": true,
      "size": 189234,
      "product": "mobile_cover"
    }
  },
  "mockups": {
    "tshirt": {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
      "size": 245760,
      "product": "tshirt"
    },
    "mobile_cover": {
      "data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
      "size": 189234,
      "product": "mobile_cover"
    }
  },
  "options": {
    "useDynamic": false,
    "useTiling": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Product not ready",
  "message": "Missing maps - run ./create_maps.sh tshirt to generate required maps"
}
```

## 🧪 Testing

### Run Test Client
```bash
npm test
```

### Manual Testing
1. Start the server: `npm start`
2. Open another terminal
3. Run: `node test_client.js`

## 🚨 Troubleshooting

### Common Issues

1. **"Product not ready"**
   - Run `./create_maps.sh <product_name>` to generate required maps

2. **"ImageMagick not found"**
   - Install ImageMagick: `sudo apt install imagemagick`

3. **"CORS error"**
   - Add your domain to the CORS origins in `server.js`

4. **"File too large"**
   - Increase the file size limit in `routes/mockupRoutes.js`

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## 🔄 Integration Examples

### JavaScript/Node.js
```javascript
import MockupAPIClient from './test_client.js';

const client = new MockupAPIClient();

// Generate t-shirt mockup
const result = await client.generateMockupFromFile('tshirt', 'path/to/image.jpg');
console.log(result.mockupUrl);
```

### Python
```python
import requests

# Generate mockup
with open('image.jpg', 'rb') as f:
    files = {'artwork': f}
    data = {'useDynamic': False, 'useTiling': True}
    response = requests.post('http://localhost:5002/api/mockup/generate/tshirt', 
                           files=files, data=data)
    result = response.json()
    print(result['mockupUrl'])
```

### cURL
```bash
# Generate mockup
curl -X POST \
  -F "artwork=@image.jpg" \
  -F "useDynamic=false" \
  -F "useTiling=true" \
  http://localhost:5002/api/mockup/generate/tshirt
```

## 📈 Performance

- **File Size Limit**: 50MB per request
- **Rate Limit**: 100 requests per 15 minutes per IP
- **Supported Formats**: JPEG, PNG, GIF, BMP, WebP
- **Processing Time**: ~2-5 seconds per mockup (depending on image size)

## 🛠️ Development

### Adding New Products
1. Add product folder to `base_images/`
2. Include `template.jpg` and `mask.png`
3. Run `./create_maps.sh <product_name>`
4. Restart the server

### Modifying API
- Routes: `routes/mockupRoutes.js`
- Controllers: `controllers/mockupController.js`
- Core Logic: `create_mockup.js`

## 📝 License

ISC License - See package.json for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Need help?** Check the API documentation at `http://localhost:5002/api/mockup/docs` when the server is running.
