import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function addBorder(params) {
  const { artwork, out } = params;
  await execShellCommand(`convert ${artwork} -bordercolor transparent -border 1 ${out}`);
}

async function tileArtwork(params, productName = 'default') {
  const { artwork, mask, out, customTileSize = null } = params;
  
  // Get mask dimensions to determine how many tiles we need
  const getMaskDimensions = `identify -format "%wx%h" ${mask}`;
  const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
  const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
  
  // Get artwork dimensions
  const getArtworkDimensions = `identify -format "%wx%h" ${artwork}`;
  const artworkDimensions = execSync(getArtworkDimensions, { encoding: 'utf8' }).trim();
  const [artworkWidth, artworkHeight] = artworkDimensions.split('x').map(Number);
  
  console.log(`Tiling artwork ${artworkWidth}x${artworkHeight} to cover mask ${maskWidth}x${maskHeight}`);
  
  let tileWidth, tileHeight;
  
  if (customTileSize) {
    // Use custom tile size (for non-tiled mode where we want single tile = mask area)
    tileWidth = customTileSize.width;
    tileHeight = customTileSize.height;
    console.log(`Using custom tile size: ${Math.round(tileWidth)}x${Math.round(tileHeight)}`);
  } else {
    // Calculate optimal tile size based on mask dimensions (original behavior for tiled mode)
    // Increased tile sizes for better visibility and coverage
    const minTileSize = Math.min(maskWidth, maskHeight) / 3; // Increased from 1/6 to 1/3 of smallest dimension
    const maxTileSize = Math.min(maskWidth, maskHeight) / 1.2; // Increased from 1/1.5 to 1/1.2 of smallest dimension
    
    // Calculate scale factor to fit artwork within optimal tile size range
    const artworkAspectRatio = artworkWidth / artworkHeight;
    
    if (artworkAspectRatio > 1) {
      // Landscape artwork - use 2/3 of mask width for much bigger tiles
      tileWidth = Math.min(maxTileSize, Math.max(minTileSize, maskWidth * 0.67));
      tileHeight = tileWidth / artworkAspectRatio;
    } else {
      // Portrait or square artwork - use 2/3 of mask height for much bigger tiles
      tileHeight = Math.min(maxTileSize, Math.max(minTileSize, maskHeight * 0.67));
      tileWidth = tileHeight * artworkAspectRatio;
    }
    
    // Ensure tile dimensions are reasonable
    tileWidth = Math.max(50, Math.min(tileWidth, maskWidth));
    tileHeight = Math.max(50, Math.min(tileHeight, maskHeight));
    
    console.log(`Optimal tile size: ${Math.round(tileWidth)}x${Math.round(tileHeight)}`);
  }
  
  // First, scale the artwork to the tile size
  const tempDir = path.join(process.cwd(), 'temp', productName);
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tempScaledArtwork = path.join(tempDir, `scaled_${Math.random().toString(36).substring(7)}.jpg`);
  const scaleCmd = `convert -limit area 256MB -limit memory 256MB ${artwork} -resize ${Math.round(tileWidth)}x${Math.round(tileHeight)}! ${tempScaledArtwork}`;
  console.log(`Scaling artwork: ${scaleCmd}`);
  await execShellCommand(scaleCmd);
  
  // Then tile the scaled artwork across the mask area
  const tileCmd = `convert -limit area 512MB -limit memory 512MB -size ${maskWidth}x${maskHeight} tile:${tempScaledArtwork} ${out}`;
  console.log(`Tiling scaled artwork: ${tileCmd}`);
  await execShellCommand(tileCmd);
  
  // Clean up temporary scaled artwork
  if (fs.existsSync(tempScaledArtwork)) {
    fs.unlinkSync(tempScaledArtwork);
  }
  
  // Verify the tiled output was created successfully
  try {
    const verifyCmd = `identify -format "%wx%h" ${out}`;
    const result = execSync(verifyCmd, { encoding: 'utf8' }).trim();
    console.log(`Tiled output created: ${result}`);
  } catch (error) {
    console.error('Failed to verify tiled output:', error);
    throw error;
  }
}

async function getArtworkAspectRatio(artworkPath) {
  try {
    const getDimensions = `identify -format "%wx%h" ${artworkPath}`;
    const dimensions = execSync(getDimensions, { encoding: 'utf8' }).trim();
    const [width, height] = dimensions.split('x').map(Number);
    return width / height;
  } catch (error) {
    console.log('Error getting artwork dimensions:', error.message);
    return 1; // Default to square aspect ratio
  }
}

async function analyzeMaskArea(maskPath) {
  try {
    // Get the actual mask dimensions first
    const getMaskDimensions = `identify -format "%wx%h" ${maskPath}`;
    const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
    const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
    
    console.log(`Analyzing mask area for ${maskWidth}x${maskHeight} mask`);
    
    // Try to find the largest white area but limit it to a reasonable size
    const analyzeCmd = `convert ${maskPath} -threshold 50% -morphology Erode Disk:5 -morphology Dilate Disk:5 -trim -format "%wx%h%O" info:`;
    const maskInfo = execSync(analyzeCmd, { encoding: 'utf8' }).trim();
    
    // Parse the output to get dimensions and offset
    const match = maskInfo.match(/(\d+)x(\d+)([+-]\d+[+-]\d+)?/);
    if (match) {
      let width = parseInt(match[1]);
      let height = parseInt(match[2]);
      const offset = match[3] ? match[3].match(/([+-]\d+)([+-]\d+)/) : null;
      let offsetX = offset ? parseInt(offset[1]) : 0;
      let offsetY = offset ? parseInt(offset[2]) : 0;
      
      // Calculate reasonable size limits based on actual mask dimensions
      const maxSize = Math.min(maskWidth, maskHeight) * 0.8; // 80% of smallest dimension
      const minSize = Math.min(maskWidth, maskHeight) * 0.2; // 20% of smallest dimension
      
      console.log(`Detected area: ${width}x${height}, limits: ${Math.round(minSize)}-${Math.round(maxSize)}`);
      
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
        // Re-center the offset
        offsetX = Math.floor((maskWidth - width) / 2);
        offsetY = Math.floor((maskHeight - height) / 2);
        console.log(`Scaled down to: ${width}x${height} at (${offsetX}, ${offsetY})`);
      } else if (width < minSize || height < minSize) {
        // For small areas, ensure they're not too tiny but don't over-scale
        const scale = Math.max(minSize / width, minSize / height);
        if (scale > 1.5) { // Only scale if significantly too small
          width = Math.floor(width * Math.min(scale, 1.5));
          height = Math.floor(height * Math.min(scale, 1.5));
          // Re-center the offset
          offsetX = Math.floor((maskWidth - width) / 2);
          offsetY = Math.floor((maskHeight - height) / 2);
          console.log(`Scaled up to: ${width}x${height} at (${offsetX}, ${offsetY})`);
        }
      }
      
      console.log(`Final mask area: ${width}x${height} at (${offsetX}, ${offsetY})`);
      return { width, height, offsetX, offsetY };
    }
  } catch (error) {
    console.log('Mask analysis failed, using fallback method');
  }
  
  // Fallback: Use proportional coordinates based on actual mask size
  console.log('Using fallback coordinates');
  const getMaskDimensions = `identify -format "%wx%h" ${maskPath}`;
  const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
  const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
  
  // Use 60% of the smallest dimension as fallback mask area
  const maskSize = Math.min(maskWidth, maskHeight) * 0.6;
  return {
    width: Math.floor(maskSize),
    height: Math.floor(maskSize),
    offsetX: Math.floor((maskWidth - maskSize) / 2),
    offsetY: Math.floor((maskHeight - maskSize) / 2)
  };
}

async function perspectiveTransform(params) {
  const { template, artwork, mask, out, useOriginalCoords = false, isTiled = false } = params;
  
  // Get artwork dimensions
  const getDimensions = `identify -format "%wx%h" ${artwork}`;
  const dimensions = execSync(getDimensions, { encoding: 'utf8' }).trim();
  const [artworkWidth, artworkHeight] = dimensions.split('x').map(Number);
  
  // Get template dimensions for proper scaling
  const getTemplateDimensions = `identify -format "%wx%h" ${template}`;
  const templateDimensions = execSync(getTemplateDimensions, { encoding: 'utf8' }).trim();
  const [templateWidth, templateHeight] = templateDimensions.split('x').map(Number);
  
  let coordinates;
  
  if (useOriginalCoords) {
    if (isTiled) {
      // For tiled artwork, we need to adjust the coordinates to work with the full tiled dimensions
      console.log('Using original coordinates adapted for tiled artwork');
      const maskArea = await analyzeMaskArea(mask);
      console.log('Mask area for tiling:', maskArea);
      
      // Source coordinates (full tiled artwork)
      const srcCoords = [0, 0, artworkWidth, 0, 0, artworkHeight, artworkWidth, artworkHeight];
      
      // Destination coordinates (mask area with perspective) - scale to template dimensions
      const getMaskDimensions = `identify -format "%wx%h" ${mask}`;
      const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
      const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
      const scaleX = templateWidth / maskWidth;
      const scaleY = templateHeight / maskHeight;
      const perspectiveOffset = Math.min(50, maskArea.width * 0.1) * scaleX;
      
      const dstCoords = [
        maskArea.offsetX * scaleX, maskArea.offsetY * scaleY,                                    // top-left
        (maskArea.offsetX + maskArea.width) * scaleX, maskArea.offsetY * scaleY,                   // top-right  
        (maskArea.offsetX + perspectiveOffset) * scaleX, (maskArea.offsetY + maskArea.height) * scaleY,     // bottom-left (with perspective)
        (maskArea.offsetX + maskArea.width - perspectiveOffset) * scaleX, (maskArea.offsetY + maskArea.height) * scaleY  // bottom-right (with perspective)
      ];
      
      coordinates = [...srcCoords, ...dstCoords].join(',');
    } else {
      // Use coordinates adapted for single artwork - use detected mask area
      console.log('=== PERSPECTIVE TRANSFORM - NON-TILED ===');
      console.log('Using coordinates adapted for single artwork');
      
      // Get the actual mask area dimensions (not the full mask image)
      const maskArea = await analyzeMaskArea(mask);
      console.log('Detected mask area:', maskArea);
      
      console.log(`Template dimensions: ${templateWidth}x${templateHeight}`);
      
      // Source coordinates (artwork corners - matches mask area dimensions)
      const srcCoords = [0, 0, maskArea.width, 0, 0, maskArea.height, maskArea.width, maskArea.height];
      console.log('Source coordinates:', srcCoords);
      
      // Destination coordinates (mask area with perspective) - scale to template dimensions
      const getMaskDimensions = `identify -format "%wx%h" ${mask}`;
      const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
      const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
      const scaleX = templateWidth / maskWidth;
      const scaleY = templateHeight / maskHeight;
      const perspectiveOffset = Math.min(50, maskArea.width * 0.1) * scaleX;
      
      console.log(`Scale factors: scaleX=${scaleX}, scaleY=${scaleY}`);
      console.log(`Perspective offset: ${perspectiveOffset}`);
      
      // Expand the destination area slightly to ensure complete coverage
      const expansionFactor = 1.1; // 10% expansion
      const expandedOffsetX = Math.max(0, maskArea.offsetX - (maskArea.width * 0.05));
      const expandedOffsetY = Math.max(0, maskArea.offsetY - (maskArea.height * 0.05));
      const expandedWidth = Math.min(templateWidth, (maskArea.width + maskArea.width * 0.1));
      const expandedHeight = Math.min(templateHeight, (maskArea.height + maskArea.height * 0.1));
      
      console.log(`Expanded area: ${expandedWidth}x${expandedHeight} at (${expandedOffsetX}, ${expandedOffsetY})`);
      
      const dstCoords = [
        expandedOffsetX * scaleX, expandedOffsetY * scaleY,                                    // top-left
        (expandedOffsetX + expandedWidth) * scaleX, expandedOffsetY * scaleY,                   // top-right  
        (expandedOffsetX + perspectiveOffset) * scaleX, (expandedOffsetY + expandedHeight) * scaleY,     // bottom-left (with perspective)
        (expandedOffsetX + expandedWidth - perspectiveOffset) * scaleX, (expandedOffsetY + expandedHeight) * scaleY  // bottom-right (with perspective)
      ];
      
      console.log('Destination coordinates:', dstCoords);
      
      coordinates = [...srcCoords, ...dstCoords].join(',');
      console.log('Final coordinates string:', coordinates);
    }
  } else {
    // For non-tiled images, use detected mask area
    console.log('Using detected mask area for non-tiled artwork');
    
    // Get the actual mask area dimensions (not the full mask image)
    const maskArea = await analyzeMaskArea(mask);
    console.log('Detected mask area:', maskArea);
    
    console.log(`Template dimensions: ${templateWidth}x${templateHeight}`);
    
    // Source coordinates (artwork corners - matches mask area dimensions)
    const srcCoords = [0, 0, maskArea.width, 0, 0, maskArea.height, maskArea.width, maskArea.height];
    console.log('Source coordinates:', srcCoords);
    
    // Destination coordinates (mask area with perspective) - scale to template dimensions
    const getMaskDimensions = `identify -format "%wx%h" ${mask}`;
    const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
    const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
    const scaleX = templateWidth / maskWidth;
    const scaleY = templateHeight / maskHeight;
    const perspectiveOffset = Math.min(50, maskArea.width * 0.1) * scaleX;
    
    console.log(`Scale factors: scaleX=${scaleX}, scaleY=${scaleY}`);
    console.log(`Perspective offset: ${perspectiveOffset}`);
    
    // Use exact mask area for precise positioning
    console.log(`Using exact mask area: ${maskArea.width}x${maskArea.height} at (${maskArea.offsetX}, ${maskArea.offsetY})`);
    
    const dstCoords = [
      maskArea.offsetX * scaleX, maskArea.offsetY * scaleY,                                    // top-left
      (maskArea.offsetX + maskArea.width) * scaleX, maskArea.offsetY * scaleY,                   // top-right  
      (maskArea.offsetX + perspectiveOffset) * scaleX, (maskArea.offsetY + maskArea.height) * scaleY,     // bottom-left (with perspective)
      (maskArea.offsetX + maskArea.width - perspectiveOffset) * scaleX, (maskArea.offsetY + maskArea.height) * scaleY  // bottom-right (with perspective)
    ];
    
    console.log('Destination coordinates:', dstCoords);
    
    coordinates = [...srcCoords, ...dstCoords].join(',');
    console.log('Final coordinates string:', coordinates);
  }
  
  console.log('Using coordinates:', coordinates);
  
  const transform = `convert -limit area 1024MB -limit memory 1024MB ${template} -alpha transparent \\( ${artwork} +distort perspective ${coordinates} \\) -background transparent -layers merge +repage ${out}`;
  await execShellCommand(transform);
}

async function setBackgroundColor(params) {
  const { artwork, color = 'transparent', out } = params;
  const setBackground = `convert ${artwork} -background "${color}" -alpha remove ${out}`;
  await execShellCommand(setBackground);
}

async function addDisplacement(params) {
  const { artwork, displacementMap, out, dx = 20, dy = 20 } = params;
  const displace = `convert ${artwork} ${displacementMap} -compose displace -set option:compose:args ${dx}x${dy} -composite ${out}`;
  await execShellCommand(displace);
}

async function addHighlights(params) {
  const { artwork, lightingMap, out, mode = 'hardlight', strength = 40 } = params;
  const highlight = `convert ${artwork} ${lightingMap} -compose ${mode} -define compose:args=${strength} -composite ${out}`;
  await execShellCommand(highlight);
}

async function adjustColors(params) {
  const { artwork, adjustmentMap, out, strength = 30, mode = 'multiply' } = params;
  const adjust = `convert ${artwork} ${adjustmentMap} -compose ${mode} -define compose:args=${strength} -composite ${out}`;
  await execShellCommand(adjust);
}

async function composeArtwork(params, productName = 'default') {
  const { template, artwork, mask, out, mode = 'over', useTiling = true } = params;
  
  if (useTiling) {
    // For tiled images, use the standard composition
    const compose = `convert ${template} ${artwork} ${mask} -compose ${mode} -composite ${out}`;
    await execShellCommand(compose);
  } else {
    // For non-tiled images, use a more precise composition method
    // First, apply the mask to the artwork to create a properly masked overlay
    const tempDir = path.join(process.cwd(), 'temp', productName);
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tmpMasked = path.join(tempDir, `masked_${Math.random().toString(36).substring(7)}.png`);
    
    try {
      // Apply mask to artwork using CopyOpacity to create proper transparency
      const maskArtwork = `convert ${artwork} ${mask} -alpha Off -compose CopyOpacity -composite ${tmpMasked}`;
      console.log('Masking artwork command:', maskArtwork);
      await execShellCommand(maskArtwork);
      
      // Composite the masked artwork onto the template
      const compose = `convert ${template} ${tmpMasked} -compose ${mode} -composite ${out}`;
      console.log('Composing masked artwork command:', compose);
      await execShellCommand(compose);
      
    } finally {
      // Clean up temporary masked file
      if (fs.existsSync(tmpMasked)) {
        fs.unlinkSync(tmpMasked);
      }
    }
  }
}

async function generateMockup(params, productName = 'default') {
  const { artwork, template, displacementMap, lightingMap, adjustmentMap, mask, out, useOriginalCoords = true, useTiling = true } = params;
  const tempDir = path.join(process.cwd(), 'temp', productName);
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const tmp = path.join(tempDir, `${Math.random().toString(36).substring(7)}.png`);
  const tmp2 = path.join(tempDir, `${Math.random().toString(36).substring(7)}.png`);
  
  
  // Unified approach: both tiled and non-tiled use the same tiling process
  if (useTiling) {
    // Standard tiled mode: use optimal tile size for multiple tiles
    console.log('=== TILED MODE ===');
    await tileArtwork({ artwork, mask, out: tmp }, productName);
    await addBorder({ artwork: tmp, out: tmp2 });
    await perspectiveTransform({ template, artwork: tmp2, mask, out: tmp2, useOriginalCoords, isTiled: true });
    fs.unlinkSync(tmp);
  } else {
    // Non-tiled mode: use single tile with mask area dimensions
    console.log('=== NON-TILED MODE (Single Tile) ===');
    console.log('Original artwork path:', artwork);
    
    // Get the actual mask area dimensions (not the full mask image)
    const maskArea = await analyzeMaskArea(mask);
    console.log('Detected mask area:', maskArea);
    
    // Use much larger tile dimensions than mask area for better coverage
    const scaleFactor = 2.0; // 2x larger than mask area
    const customTileSize = {
      width: Math.ceil(maskArea.width * scaleFactor),
      height: Math.ceil(maskArea.height * scaleFactor)
    };
    
    console.log(`Using single tile with increased dimensions: ${customTileSize.width}x${customTileSize.height} (${scaleFactor}x mask area)`);
    
    // Tile with custom size (this will create a single tile that matches mask area)
    await tileArtwork({ artwork, mask, out: tmp, customTileSize }, productName);
    await addBorder({ artwork: tmp, out: tmp2 });
    
    // Use the same perspective transform as tiled images
    await perspectiveTransform({ template, artwork: tmp2, mask, out: tmp2, useOriginalCoords, isTiled: true });
    console.log('Applied perspective transform for non-tiled image (single tile mode)');
    
    fs.unlinkSync(tmp);
  }
  
  // await setBackgroundColor({ artwork: tmp, color: 'black', out: tmp });
  console.log('=== FINAL PROCESSING STEPS ===');
  console.log('useTiling:', useTiling);
  console.log('Using artwork file:', tmp2);
  
  // Apply the same effects for both tiled and non-tiled images
  await addDisplacement({ artwork: tmp2, displacementMap, out: tmp2 });
  console.log('Applied displacement');
  
  await addHighlights({ artwork: tmp2, lightingMap, out: tmp2 });
  console.log('Applied highlights');
  
  await adjustColors({ artwork: tmp2, adjustmentMap, out: tmp2 });
  console.log('Applied color adjustments');
  
  console.log('=== COMPOSING ARTWORK ===');
  console.log('Template:', template);
  console.log('Artwork:', tmp2);
  console.log('Mask:', mask);
  console.log('Output:', out);
  
  // Use the standard composition method for both tiled and non-tiled (unified approach)
  await composeArtwork({ template, artwork: tmp2, mask, out, useTiling: true }, productName);
  console.log('Composed artwork with template');
  
  // fs.unlinkSync(tmp2);  // Commented out to preserve pattern mask image
  console.log('Temporary files preserved (cleanup disabled)');
}

function execShellCommand(command) {
  return new Promise((resolve, reject) => {
    try {
      execSync(command);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate the next available output filename in the mockups/ folder.
 * e.g., output.jpg, output1.jpg, output2.jpg ...
 */
function getNextOutputFile() {
  const mockupDir = path.join(process.cwd(), "mockups");

  // ensure the folder exists
  if (!fs.existsSync(mockupDir)) {
    fs.mkdirSync(mockupDir);
  }

  const files = fs.readdirSync(mockupDir);
  let index = 0;
  let filename = "output.jpg";

  // keep incrementing until we find an unused filename
  while (files.includes(filename)) {
    index++;
    filename = `output${index}.jpg`;
  }

  return path.join(mockupDir, filename);
}

/**
 * Generate mockup for specific product with custom artwork
 * @param {string} productName - Name of the product (e.g., 'tshirt', 'mug', 'curtain')
 * @param {string} artworkFile - Path to artwork file
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Path to generated mockup file
 */
async function generateProductMockup(productName, artworkFile, options = {}) {
    const {
        useDynamic = false,
        useTiling = true,
        outputDir = `mockups/${productName}`
    } = options;
    
    // Validate product exists
    const baseDir = `base_images/${productName}`;
    const mapsDir = `maps/${productName}`;
    
    if (!fs.existsSync(baseDir)) {
        throw new Error(`Product '${productName}' not found in base_images/`);
    }
    
    if (!fs.existsSync(mapsDir)) {
        throw new Error(`Maps for '${productName}' not found. Run ./create_maps.sh ${productName} first.`);
    }
    
    // Check if required files exist
    const templatePath = `${baseDir}/template.jpg`;
    const maskPath = `${baseDir}/mask.png`;
    const displacementPath = `${mapsDir}/displacement_map.png`;
    const lightingPath = `${mapsDir}/lighting_map.png`;
    const adjustmentPath = `${mapsDir}/adjustment_map.jpg`;
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template image not found: ${templatePath}`);
    }
    if (!fs.existsSync(maskPath)) {
        throw new Error(`Mask image not found: ${maskPath}`);
    }
    if (!fs.existsSync(displacementPath)) {
        throw new Error(`Displacement map not found: ${displacementPath}`);
    }
    if (!fs.existsSync(lightingPath)) {
        throw new Error(`Lighting map not found: ${lightingPath}`);
    }
    if (!fs.existsSync(adjustmentPath)) {
        throw new Error(`Adjustment map not found: ${adjustmentPath}`);
    }
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get next output file for this product
    const outputFile = getNextOutputFileForProduct(productName);
    
    const mockupParams = {
        'out': outputFile,
        'artwork': artworkFile,
        'template': templatePath,
        'mask': maskPath,
        'displacementMap': displacementPath,
        'lightingMap': lightingPath,
        'adjustmentMap': adjustmentPath,
        'useOriginalCoords': !useDynamic,
        'useTiling': useTiling
    };
    
    console.log(`Generating mockup for ${productName} with artwork ${artworkFile}`);
    console.log(`Output: ${outputFile}`);
    
    await generateMockup(mockupParams, productName);
    return outputFile;
}

/**
 * Get next available output filename for specific product
 * @param {string} productName - Name of the product
 * @returns {string} - Path to next output file
 */
function getNextOutputFileForProduct(productName) {
    const mockupDir = path.join(process.cwd(), "mockups", productName);
    
    if (!fs.existsSync(mockupDir)) {
        fs.mkdirSync(mockupDir, { recursive: true });
    }
    
    const files = fs.readdirSync(mockupDir);
    let index = 0;
    let filename = "output.jpg";
    
    while (files.includes(filename)) {
        index++;
        filename = `output${index}.jpg`;
    }
    
    return path.join(mockupDir, filename);
}

/**
 * List available products
 * @returns {Array<string>} - Array of available product names
 */
function listAvailableProducts() {
    const baseDir = path.join(process.cwd(), "base_images");
    
    if (!fs.existsSync(baseDir)) {
        console.log("No base_images directory found");
        return [];
    }
    
    const products = fs.readdirSync(baseDir)
        .filter(item => fs.statSync(path.join(baseDir, item)).isDirectory())
        .filter(product => {
            const templatePath = path.join(baseDir, product, "template.jpg");
            const maskPath = path.join(baseDir, product, "mask.png");
            return fs.existsSync(templatePath) && fs.existsSync(maskPath);
        });
    
    return products;
}

/**
 * Check if product has all required files
 * @param {string} productName - Name of the product
 * @returns {Object} - Status object with hasBaseImages, hasMaps, isReady
 */
function checkProductStatus(productName) {
    const baseDir = `base_images/${productName}`;
    const mapsDir = `maps/${productName}`;
    
    const hasBaseImages = fs.existsSync(`${baseDir}/template.jpg`) && fs.existsSync(`${baseDir}/mask.png`);
    const hasMaps = fs.existsSync(`${mapsDir}/displacement_map.png`) && 
                   fs.existsSync(`${mapsDir}/lighting_map.png`) && 
                   fs.existsSync(`${mapsDir}/adjustment_map.jpg`);
    
    return {
        hasBaseImages,
        hasMaps,
        isReady: hasBaseImages && hasMaps
    };
}

/**
 * Generate mockup from image buffer/stream - Main reusable function
 * @param {Buffer|string} imageInput - Image as buffer, file path, or base64 string
 * @param {string} productName - Name of the product (e.g., 'tshirt', 'mug', 'curtain', 'mobile_cover')
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} - Generated mockup as buffer
 */
async function generateMockupFromImage(imageInput, productName, options = {}) {
    const {
        useDynamic = false,
        useTiling = true,
        quality = 90
    } = options;
    
    
    // Validate product exists
    const baseDir = `base_images/${productName}`;
    const mapsDir = `maps/${productName}`;
    
    if (!fs.existsSync(baseDir)) {
        throw new Error(`Product '${productName}' not found in base_images/`);
    }
    
    if (!fs.existsSync(mapsDir)) {
        throw new Error(`Maps for '${productName}' not found. Run ./create_maps.sh ${productName} first.`);
    }
    
    // Check if required files exist
    const templatePath = `${baseDir}/template.jpg`;
    const maskPath = `${baseDir}/mask.png`;
    const displacementPath = `${mapsDir}/displacement_map.png`;
    const lightingPath = `${mapsDir}/lighting_map.png`;
    const adjustmentPath = `${mapsDir}/adjustment_map.jpg`;
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template image not found: ${templatePath}`);
    }
    if (!fs.existsSync(maskPath)) {
        throw new Error(`Mask image not found: ${maskPath}`);
    }
    if (!fs.existsSync(displacementPath)) {
        throw new Error(`Displacement map not found: ${displacementPath}`);
    }
    if (!fs.existsSync(lightingPath)) {
        throw new Error(`Lighting map not found: ${lightingPath}`);
    }
    if (!fs.existsSync(adjustmentPath)) {
        throw new Error(`Adjustment map not found: ${adjustmentPath}`);
    }
    
    // Create temporary files for processing in product-specific temp directory
    const tempDir = path.join(process.cwd(), 'temp', productName);
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempArtworkPath = path.join(tempDir, `artwork_${Math.random().toString(36).substring(7)}.jpg`);
    const tempOutputPath = path.join(tempDir, `output_${Math.random().toString(36).substring(7)}.jpg`);
    
    try {
        // Handle different input types
        if (Buffer.isBuffer(imageInput)) {
            // Image is a buffer
            fs.writeFileSync(tempArtworkPath, imageInput);
        } else if (typeof imageInput === 'string') {
            if (imageInput.startsWith('data:image/')) {
                // Base64 string
                const base64Data = imageInput.replace(/^data:image\/[a-z]+;base64,/, '');
                fs.writeFileSync(tempArtworkPath, base64Data, 'base64');
            } else if (fs.existsSync(imageInput)) {
                // File path
                fs.copyFileSync(imageInput, tempArtworkPath);
            } else {
                throw new Error('Invalid image input: file not found or invalid format');
            }
        } else {
            throw new Error('Invalid image input type');
        }
        
        // Generate mockup using the temporary artwork
        const mockupParams = {
            'out': tempOutputPath,
            'artwork': tempArtworkPath,
            'template': templatePath,
            'mask': maskPath,
            'displacementMap': displacementPath,
            'lightingMap': lightingPath,
            'adjustmentMap': adjustmentPath,
            'useOriginalCoords': !useDynamic,
            'useTiling': useTiling
        };
        
        console.log(`Generating mockup for ${productName} with provided artwork`);
        
        await generateMockup(mockupParams, productName);
        
        // Read the generated mockup as buffer
        const mockupBuffer = fs.readFileSync(tempOutputPath);
        
        return mockupBuffer;
        
    } finally {
        // Clean up temporary files - DISABLED to preserve files
        // if (fs.existsSync(tempArtworkPath)) {
        //     fs.unlinkSync(tempArtworkPath);
        // }
        // if (fs.existsSync(tempOutputPath)) {
        //     fs.unlinkSync(tempOutputPath);
        // }
        console.log('Temporary files preserved (cleanup disabled)');
    }
}

// Export the main function as default
export default generateMockupFromImage;

// Export other useful functions
export {
    generateProductMockup,
    listAvailableProducts,
    checkProductStatus,
    getNextOutputFileForProduct
};

// CLI functionality (only runs if called directly)
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    
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
    
    const productArg = args.find(arg => arg.startsWith('--product=')) || args.find(arg => arg.startsWith('-p='));
    const productName = productArg ? productArg.split('=')[1] : null;
    
    if (!productName) {
        console.log('Usage: node create_mockup.js --product=PRODUCT_NAME --artwork=ARTWORK_FILE');
        console.log('       node create_mockup.js --list-products');
        process.exit(1);
    }
    
    const useDynamic = args.includes('--dynamic') || args.includes('-d');
    const disableTiling = args.includes('--no-tile') || args.includes('--single');
    const useTiling = !disableTiling;
    const artworkArg = args.find(arg => arg.startsWith('--artwork=')) || args.find(arg => arg.startsWith('-a='));
    const artworkFile = artworkArg ? artworkArg.split('=')[1] : "swatches/art9.jpg";
    
    console.log(`Product: ${productName}`);
    console.log(`Using ${useDynamic ? 'dynamic' : 'original'} coordinates`);
    console.log(`Tiling: ${useTiling ? 'enabled (DEFAULT)' : 'disabled'}`);
    console.log(`Artwork: ${artworkFile}`);
    
    // Generate mockup for specific product
    generateProductMockup(productName, artworkFile, {
        useDynamic,
        useTiling
    }).then(outputFile => {
        console.log(`Mockup generated: ${outputFile}`);
    }).catch(error => {
        console.error('Error generating mockup:', error.message);
        process.exit(1);
    });
}