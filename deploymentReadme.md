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

## **Option 2: Cloud VPS (Free Tier)**

### **🌟 AWS EC2 (Recommended - Free Tier)**

AWS offers the best free tier for API-only servers:

#### **What You Get:**
- **EC2 t2.micro**: 750 hours/month for 12 months
- **1GB RAM, 1 vCPU**
- **30GB storage**
- **Ubuntu 20.04/22.04**
- **Perfect for your mockup API**

#### **Deployment Steps:**
1. **Create AWS Account** at [aws.amazon.com](https://aws.amazon.com)
2. **Launch EC2 Instance:**
   - Choose Ubuntu 22.04 LTS
   - Select t2.micro (Free tier eligible)
   - Create/Select Key Pair
   - Configure Security Group (SSH, HTTP, Custom TCP 5002)
3. **Connect to Server:**
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   ```
4. **Setup Environment:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo apt install imagemagick -y
   sudo npm install -g pm2
   ```
5. **Deploy Application:**
   ```bash
   git clone https://github.com/yourusername/mockup-generator.git
   cd mockup-generator
   npm install
   ./create_maps.sh
   pm2 start server.js
   pm2 save
   pm2 startup
   ```

#### **Pros:**
- ✅ 12 months completely free
- ✅ Full Linux control
- ✅ ImageMagick works perfectly
- ✅ Production ready
- ✅ Easy setup

#### **Cons:**
- ❌ Requires credit card (won't charge for free tier)
- ❌ 12-month limit

### **🌟 Google Cloud Platform (Free Tier)**

#### **What You Get:**
- **e2-micro**: 720 hours/month
- **1GB RAM, 1 vCPU**
- **30GB storage**
- **Ubuntu 20.04/22.04**
- **$300 credit for 90 days**

#### **Deployment Steps:**
1. **Create GCP Account** at [cloud.google.com](https://cloud.google.com)
2. **Create VM Instance:**
   - Choose e2-micro (Free tier)
   - Select Ubuntu 22.04
   - Allow HTTP traffic
3. **Connect and Setup** (same as AWS)

#### **Pros:**
- ✅ Always free tier available
- ✅ $300 credit for 90 days
- ✅ Full Linux control
- ✅ ImageMagick works perfectly

#### **Cons:**
- ❌ Requires credit card
- ❌ More complex than AWS

### **🌟 DigitalOcean Droplet (Paid)**

#### **What You Get:**
- **Basic Droplet**: $5/month
- **1GB RAM, 1 vCPU**
- **25GB storage**
- **Ubuntu 20.04/22.04**

#### **Deployment Steps:**
1. **Create DigitalOcean Account**
2. **Create Droplet:**
   - Choose Ubuntu 22.04
   - Select Basic $5/month plan
   - Add SSH key
3. **Connect and Setup** (same as AWS)

#### **Pros:**
- ✅ Very reliable
- ✅ Simple pricing
- ✅ Good documentation
- ✅ Easy setup

#### **Cons:**
- ❌ No free tier
- ❌ $5/month cost

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
| **AWS EC2** | 750 hours/month | $5+/month | ✅ Native | ⭐⭐⭐⭐⭐ |
| **Google Cloud** | 720 hours/month | $5+/month | ✅ Native | ⭐⭐⭐⭐⭐ |
| **DigitalOcean** | None | $5+/month | ✅ Native | ⭐⭐⭐⭐⭐ |
| **Linode** | None | $5+/month | ✅ Native | ⭐⭐⭐⭐⭐ |
| **Vultr** | None | $2.50+/month | ✅ Native | ⭐⭐⭐⭐⭐ |

## **🎯 Recommended Deployment Strategy**

### **For Testing/Development:**
1. **AWS EC2** - 12 months completely free
2. **Google Cloud** - Always free tier available

### **For Production:**
1. **AWS EC2** - Best free tier, full control
2. **Google Cloud** - Good alternative with credits
3. **DigitalOcean** - Simple and reliable

### **For High Traffic:**
1. **AWS EC2** with Load Balancer
2. **Google Cloud** with multiple instances
3. **VPS with PM2 clustering** - Multiple Node.js instances

## **🚀 Quick Start Commands**

### **AWS EC2 Deployment (Recommended)**
```bash
# 1. Create EC2 instance (via AWS Console)
# 2. Connect to server
ssh -i your-key.pem ubuntu@your-server-ip

# 3. Setup environment
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install imagemagick -y
sudo npm install -g pm2

# 4. Deploy application
git clone https://github.com/yourusername/mockup-generator.git
cd mockup-generator
npm install
./create_maps.sh
pm2 start server.js
pm2 save
pm2 startup
```

### **Google Cloud Deployment**
```bash
# 1. Create VM instance (via GCP Console)
# 2. Connect to server (same as AWS)
# 3. Run same setup commands as AWS
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
