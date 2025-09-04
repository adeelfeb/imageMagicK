# **Product Mockup Generator with Automatic Pattern Tiling**

Hey there! 👋 This tool helps you create awesome product mockups by automatically tiling your artwork patterns across the entire surface. It's super easy to use once you get it set up!

## **🚀 What You Need**

**For Windows users:** You'll need WSL2 (Windows Subsystem for Linux) - it's like having Linux inside Windows!

**For Linux users:** You're all set! Just follow the setup steps below.

## **📦 Step 1: Get Your Linux Environment Ready**

### **If you're on Windows:**
```bash
# Open PowerShell as Administrator and run:
wsl --install
# This will install WSL2 and Ubuntu
```

### **If you're on Linux:**
You're good to go! Skip to the next step.

## **🛠️ Step 2: Install Everything You Need**

Open your WSL2 terminal (or Linux terminal) and run these commands:

```bash
# Update your system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
sudo apt install nodejs npm -y

# Install ImageMagick (this is what does the magic!)
sudo apt install imagemagick -y

# Check if everything installed correctly
node --version
npm --version
convert --version
```

## **📁 Step 3: Set Up the Project**

```bash
# Clone this project
git clone <your-repo-url>
cd mockup

# Install the required libraries
npm install
```

## **🎨 Step 4: Prepare Your Images**

### **Add Your Base Images:**
- Put your product template image as `base_images/template.jpg` (like a t-shirt, mug, etc.)
- Put your mask image as `base_images/mask.png` (white areas = where your pattern will go)

### **Add Your Artwork:**
- Drop your pattern/design files into the `swatches/` folder
- Any JPG or PNG file works great!

## **🔧 Step 5: Generate the Magic Maps**

This step creates the special maps that make your mockup look realistic:

```bash
# Generate all the required maps
sh create_maps.sh base_images/template.jpg base_images/mask.png
```

This will create files in the `maps/` folder that handle lighting, shadows, and texture effects.

## **🎯 Step 6: Create Your Mockups!**

Now the fun part! Here's how to use it:

### **Basic Usage (Recommended):**
```bash
# Create a mockup with the default pattern - it will automatically tile across the whole surface!
node create_mockup.js

# Use your own pattern
node create_mockup.js --artwork=swatches/your-pattern.jpg
```

### **Other Options:**
```bash
# Try different patterns
node create_mockup.js --artwork=swatches/floral-design.jpg
node create_mockup.js --artwork=swatches/geometric-pattern.png

# Use dynamic positioning (experimental)
node create_mockup.js --dynamic --artwork=swatches/your-pattern.jpg

# Place just one copy of your pattern (no tiling)
node create_mockup.js --no-tile --artwork=swatches/your-pattern.jpg
```

## **📂 What You'll Get**

Your generated mockups will appear in the `mockups/` folder:
- `output.jpg` - Your first mockup
- `output1.jpg` - Your second mockup
- `output2.jpg` - And so on...

## **💡 Pro Tips**

1. **Use high-quality images** - The better your template and pattern, the better your mockup
2. **Make sure your mask is clean** - White areas should be crisp and clear
3. **Try seamless patterns** - They tile better and look more professional
4. **Experiment with different patterns** - The tool works with any JPG/PNG file!

## **🚨 Having Issues?**

### **"Command not found" errors:**
Make sure you're in the WSL2 terminal (not Windows PowerShell) and that you've installed everything from Step 2.

### **"Permission denied" on Windows:**
Use WSL2 instead of PowerShell:
```bash
wsl
cd /path/to/your/mockup/folder
node create_mockup.js
```

### **No output files:**
Check if the maps were generated:
```bash
ls maps/
# You should see displacement_map.png, lighting_map.png, and adjustment_map.jpg
```

### **Pattern not tiling:**
Tiling is the default behavior! If you want just one copy of your pattern, use:
```bash
node create_mockup.js --no-tile --artwork=swatches/your-pattern.jpg
```

## **🎉 That's It!**

You're all set! The tool will automatically tile your patterns across the entire surface of your product mockup. Just run `node create_mockup.js` and watch the magic happen! ✨

Need help? Just ask! 😊
