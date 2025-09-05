# **🚀 Mockup Generator API - Deployment Guide**

This guide will help you deploy your mockup generator API to various cloud platforms and servers. This is an API-only server that receives requests from other applications - no frontend required.

## **📋 Prerequisites**

Before deploying, ensure you have:
- A working mockup generator API (this repository)
- Basic knowledge of Linux commands
- A cloud provider account (for cloud deployments)
- Server IP address (domain name optional)

## **🏗️ Server Requirements**

### **Minimum Specifications**
- **CPU**: 1 vCPU (2+ recommended)
- **RAM**: 1GB (2GB+ recommended)
- **Storage**: 10GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+
- **Network**: Public IP with port 5002 open

### **Software Dependencies**
- Node.js 18+
- ImageMagick 7+
- PM2 (for process management)

## **🌐 Deployment Options**

## **🎯 API-Only Deployment Benefits**

### **Why This Setup is Perfect for API-Only Servers:**
- ✅ **No Frontend Required** - Just pure API endpoints
- ✅ **Simpler Setup** - No Nginx or SSL configuration needed
- ✅ **Faster Deployment** - 10 minutes vs 30+ minutes
- ✅ **Lower Resource Usage** - No web server overhead
- ✅ **Direct Communication** - Server-to-server requests work perfectly
- ✅ **Easy Scaling** - PM2 handles multiple instances automatically

### **Your API Endpoints:**
```
http://your-server-ip:5002/api/mockup/generate/tshirt
http://your-server-ip:5002/api/mockup/generate/mobile_cover
http://your-server-ip:5002/api/mockup/generate
http://your-server-ip:5002/health
```

## **Option 1: VPS Deployment (Recommended for Production)**

### **Popular VPS Providers**
- **DigitalOcean**: $5/month droplet
- **Linode**: $5/month nanode
- **Vultr**: $2.50/month instance
- **AWS EC2**: t3.micro (free tier eligible)
- **Google Cloud**: e2-micro (free tier eligible)

### **Step-by-Step VPS Deployment**

#### **1. Server Setup**
```bash
ssh root@your-server-ip
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs
apt install imagemagick -y
npm install -g pm2
```

#### **2. Deploy Application**
```bash
git clone https://github.com/yourusername/mockup-generator.git
cd mockup-generator
npm install
./create_maps.sh
npm start
```

#### **3. Configure PM2**
```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mockup-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
```

```bash
mkdir logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### **4. Open Firewall Port**
```bash
ufw allow 5002
ufw enable
```

#### **5. Test Your API**
```bash
curl http://your-server-ip:5002/health
curl http://your-server-ip:5002/api/mockup/products
```

## **Option 2: Free Tier Cloud Services**

### **🌟 Railway (Recommended - Free Tier)**

Railway offers excellent free tier with easy deployment:

#### **Deployment Steps:**
1. **Sign up** at [railway.app](https://railway.app)
2. **Connect GitHub** repository
3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5002
   ```
4. **Deploy** - Railway auto-detects Node.js
5. **Add ImageMagick** via Railway's Nixpacks

#### **Railway Configuration:**
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

#### **Pros:**
- ✅ Free tier: $5 credit monthly
- ✅ Automatic deployments
- ✅ Built-in monitoring
- ✅ Easy scaling

#### **Cons:**
- ❌ ImageMagick needs custom setup
- ❌ Limited free tier

### **🌟 Render (Free Tier Available)**

#### **Deployment Steps:**
1. **Sign up** at [render.com](https://render.com)
2. **Connect GitHub** repository
3. **Create Web Service**
4. **Configure:**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `NODE_ENV=production`

#### **Render Configuration:**
```yaml
services:
  - type: web
    name: mockup-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

#### **Pros:**
- ✅ Free tier available
- ✅ Automatic SSL
- ✅ Easy GitHub integration

#### **Cons:**
- ❌ ImageMagick not pre-installed
- ❌ Free tier has limitations

### **🌟 Heroku (Limited Free Tier)**

#### **Deployment Steps:**
1. **Install Heroku CLI**
2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-mockup-api
   ```
3. **Add ImageMagick buildpack:**
   ```bash
   heroku buildpacks:add https://github.com/ello/heroku-buildpack-imagemagick
   heroku buildpacks:add heroku/nodejs
   ```
4. **Deploy:**
   ```bash
   git push heroku main
   ```

#### **Pros:**
- ✅ Easy deployment
- ✅ Good documentation
- ✅ Add-ons available

#### **Cons:**
- ❌ No free tier (paid only)
- ❌ Complex ImageMagick setup

### **🌟 DigitalOcean App Platform (Free Tier)**

#### **Deployment Steps:**
1. **Sign up** at [DigitalOcean](https://digitalocean.com)
2. **Create App** from GitHub
3. **Configure:**
   - Source: GitHub repository
   - Type: Web Service
   - Build Command: `npm install`
   - Run Command: `npm start`

#### **Pros:**
- ✅ Free tier: $5 credit monthly
- ✅ Easy setup
- ✅ Good performance

#### **Cons:**
- ❌ ImageMagick needs custom Dockerfile
- ❌ Limited free tier

## **Option 3: Docker Deployment**

### **Create Dockerfile**
```dockerfile
FROM node:18-alpine

RUN apk add --no-cache imagemagick

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN ./create_maps.sh

EXPOSE 5002

CMD ["npm", "start"]
```

### **Docker Compose**
```yaml
version: '3.8'
services:
  mockup-api:
    build: .
    ports:
      - "5002:5002"
    environment:
      - NODE_ENV=production
      - PORT=5002
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

### **Deploy with Docker**
```bash
# Build image
docker build -t mockup-api .

# Run container
docker run -d -p 5002:5002 --name mockup-api mockup-api

# Or with docker-compose
docker-compose up -d
```

## **Option 4: Serverless Deployment**

### **Vercel (Free Tier)**

#### **Deployment Steps:**
1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```
2. **Deploy:**
   ```bash
   vercel
   ```
3. **Configure vercel.json:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "server.js"
       }
     ]
   }
   ```

#### **Pros:**
- ✅ Free tier available
- ✅ Automatic deployments
- ✅ Global CDN

#### **Cons:**
- ❌ ImageMagick not supported
- ❌ Function timeout limits

### **Netlify Functions (Free Tier)**

#### **Deployment Steps:**
1. **Connect GitHub** to Netlify
2. **Configure netlify.toml:**
   ```toml
   [build]
     command = "npm install"
     functions = "netlify/functions"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

#### **Pros:**
- ✅ Free tier available
- ✅ Easy GitHub integration

#### **Cons:**
- ❌ ImageMagick not supported
- ❌ Function limitations

## **🔧 Production Optimizations**

### **Environment Variables**
```bash
NODE_ENV=production
PORT=5002
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### **PM2 Monitoring**
```bash
pm2 install pm2-logrotate
pm2 install pm2-server-monit
pm2 monit
```

### **API Security (Optional)**
```javascript
// Add to server.js for basic API key authentication
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

## **📊 Monitoring & Logging**

### **Health Checks**
```bash
curl http://your-domain.com/health
curl http://your-domain.com/api/mockup/health
```

### **Log Management**
```bash
pm2 logs mockup-api
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### **Performance Monitoring**
```bash
npm install -g clinic
clinic doctor -- node server.js
```

## **💰 Cost Comparison**

| Service | Free Tier | Paid Plans | ImageMagick | API-Only Ready |
|---------|-----------|------------|-------------|----------------|
| **Railway** | $5 credit/month | $5+/month | ✅ Custom | ⭐⭐⭐⭐⭐ |
| **Render** | 750 hours/month | $7+/month | ❌ Complex | ⭐⭐⭐⭐ |
| **Heroku** | None | $7+/month | ✅ Buildpack | ⭐⭐⭐⭐ |
| **DigitalOcean** | $5 credit/month | $5+/month | ✅ Docker | ⭐⭐⭐⭐ |
| **VPS (DO/Linode)** | None | $5+/month | ✅ Native | ⭐⭐⭐⭐⭐ |
| **Vercel** | 100GB bandwidth | $20+/month | ❌ Not supported | ⭐⭐⭐ |

## **🎯 Recommended Deployment Strategy**

### **For Testing/Development:**
1. **Railway** - Best free tier with ImageMagick support
2. **Render** - Good alternative with free tier

### **For Production:**
1. **VPS (DigitalOcean/Linode)** - Full control, best performance for API-only
2. **Railway** - If you prefer managed services

### **For High Traffic:**
1. **VPS with PM2 clustering** - Multiple Node.js instances
2. **AWS EC2** with Load Balancer

## **🚀 Quick Start Commands**

### **Railway Deployment (Recommended)**
```bash
npm install -g @railway/cli
railway login
railway up
railway variables set NODE_ENV=production
```

### **VPS Deployment**
```bash
curl -sSL https://raw.githubusercontent.com/yourusername/mockup-generator/main/deploy.sh | bash
```

## **🔍 Troubleshooting**

### **Common Issues:**

1. **ImageMagick not found:**
   ```bash
   sudo apt install imagemagick -y
   sudo yum install ImageMagick -y
   ```

2. **Port already in use:**
   ```bash
   sudo lsof -ti:5002 | xargs kill -9
   ```

3. **Permission denied:**
   ```bash
   chmod +x create_maps.sh
   chmod +x *.sh
   ```

4. **Memory issues:**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

## **📞 Support**

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/mockup-generator/issues)
- **Documentation**: Check the main README.md
- **API Docs**: Visit `/api/mockup/docs` when deployed

---

**Happy Deploying! 🚀** Your mockup generator API is ready to scale and serve users worldwide!
