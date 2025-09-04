// const { execSync } = require('child_process');
// const fs = require('fs');
// const path = require('path');
// const os = require("os")
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function addBorder(params) {
  const { artwork, out } = params;
  await execShellCommand(`convert ${artwork} -bordercolor transparent -border 1 ${out}`);
}

async function tileArtwork(params) {
  const { artwork, mask, out } = params;
  
  // Get mask dimensions to determine how many tiles we need
  const getMaskDimensions = `identify -format "%wx%h" ${mask}`;
  const maskDimensions = execSync(getMaskDimensions, { encoding: 'utf8' }).trim();
  const [maskWidth, maskHeight] = maskDimensions.split('x').map(Number);
  
  // Get artwork dimensions
  const getArtworkDimensions = `identify -format "%wx%h" ${artwork}`;
  const artworkDimensions = execSync(getArtworkDimensions, { encoding: 'utf8' }).trim();
  const [artworkWidth, artworkHeight] = artworkDimensions.split('x').map(Number);
  
  console.log(`Tiling artwork ${artworkWidth}x${artworkHeight} to cover mask ${maskWidth}x${maskHeight}`);
  
  // Use the simplest and most reliable tiling method
  // Create a canvas of the mask size and tile the artwork across it
  const tileCmd = `convert -size ${maskWidth}x${maskHeight} tile:${artwork} ${out}`;
  console.log(`Executing: ${tileCmd}`);
  await execShellCommand(tileCmd);
  
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

async function analyzeMaskArea(maskPath) {
  try {
    // First, let's try to find the center area of the mask with a more conservative approach
    const templateSize = 1836;
    
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
      
      // If the detected area is too large, scale it down to a reasonable size
      const maxSize = 800; // Maximum reasonable size for artwork area
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
        // Re-center the offset
        offsetX = Math.floor((templateSize - width) / 2);
        offsetY = Math.floor((templateSize - height) / 2);
      }
      
      console.log(`Detected mask area: ${width}x${height} at (${offsetX}, ${offsetY})`);
      return { width, height, offsetX, offsetY };
    }
  } catch (error) {
    console.log('Mask analysis failed, using fallback method');
  }
  
  // Fallback: Use the working coordinates from before
  console.log('Using fallback coordinates');
  const templateSize = 1836;
  const maskSize = 600; // Conservative estimate that was working
  return {
    width: maskSize,
    height: maskSize,
    offsetX: (templateSize - maskSize) / 2,
    offsetY: (templateSize - maskSize) / 2
  };
}

async function perspectiveTransform(params) {
  const { template, artwork, mask, out, useOriginalCoords = false, isTiled = false } = params;
  
  // Get artwork dimensions
  const getDimensions = `identify -format "%wx%h" ${artwork}`;
  const dimensions = execSync(getDimensions, { encoding: 'utf8' }).trim();
  const [artworkWidth, artworkHeight] = dimensions.split('x').map(Number);
  
  let coordinates;
  
  if (useOriginalCoords) {
    if (isTiled) {
      // For tiled artwork, we need to adjust the coordinates to work with the full tiled dimensions
      console.log('Using original coordinates adapted for tiled artwork');
      // The tiled artwork is 1836x1836, so we map it to the mask area
      const maskArea = await analyzeMaskArea(mask);
      console.log('Mask area for tiling:', maskArea);
      
      // Source coordinates (full tiled artwork)
      const srcCoords = [0, 0, artworkWidth, 0, 0, artworkHeight, artworkWidth, artworkHeight];
      
      // Destination coordinates (mask area with perspective)
      const perspectiveOffset = 50;
      const dstCoords = [
        maskArea.offsetX, maskArea.offsetY,                                    // top-left
        maskArea.offsetX + maskArea.width, maskArea.offsetY,                   // top-right  
        maskArea.offsetX + perspectiveOffset, maskArea.offsetY + maskArea.height,     // bottom-left (with perspective)
        maskArea.offsetX + maskArea.width - perspectiveOffset, maskArea.offsetY + maskArea.height  // bottom-right (with perspective)
      ];
      
      coordinates = [...srcCoords, ...dstCoords].join(',');
    } else {
      // Use coordinates adapted for 612x612 artwork
      console.log('Using coordinates adapted for 612x612 artwork');
      // Source: 612x612 artwork, Destination: mask area with perspective
      coordinates = [0,0,612,0,0,612,612,612,1500,3000,1700,4000,1500,0,1700,0].join(',');
    }
  } else {
    // Analyze the mask to get the actual area where artwork should be placed
    const maskArea = await analyzeMaskArea(mask);
    console.log('Detected mask area:', maskArea);
    
    // Source coordinates (artwork corners)
    const srcCoords = [0, 0, artworkWidth, 0, 0, artworkHeight, artworkWidth, artworkHeight];
    
    // Destination coordinates (mask area corners)
    // Apply a slight perspective effect to make it look more natural
    const perspectiveOffset = 50; // Adjust this for more/less perspective
    const dstCoords = [
      maskArea.offsetX, maskArea.offsetY,                                    // top-left
      maskArea.offsetX + maskArea.width, maskArea.offsetY,                   // top-right  
      maskArea.offsetX + perspectiveOffset, maskArea.offsetY + maskArea.height,     // bottom-left (with perspective)
      maskArea.offsetX + maskArea.width - perspectiveOffset, maskArea.offsetY + maskArea.height  // bottom-right (with perspective)
    ];
    
    coordinates = [...srcCoords, ...dstCoords].join(',');
  }
  
  console.log('Using coordinates:', coordinates);
  
  const transform = `convert ${template} -alpha transparent \\( ${artwork} +distort perspective ${coordinates} \\) -background transparent -layers merge +repage ${out}`;
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
  const { artwork, lightingMap, out, mode = 'hardlight' } = params;
  // const highlight = `convert ${artwork} \( -clone 0 ${lightingMap} -compose ${mode} -composite \) +swap -compose CopyOpacity -composite ${out}`;
  const highlight = `convert ${artwork} \\( -clone 0 ${lightingMap} -compose ${mode} -composite \\) +swap -compose CopyOpacity -composite ${out}`;
  await execShellCommand(highlight);
}

async function adjustColors(params) {
  const { artwork, adjustmentMap, out } = params;
  // const adjust = `convert ${artwork} \( -clone 0 ${adjustmentMap} -compose multiply -composite \) +swap -compose CopyOpacity -composite ${out}`;
  const adjust = `convert ${artwork} \\( -clone 0 ${adjustmentMap} -compose multiply -composite \\) +swap -compose CopyOpacity -composite ${out}`;
  await execShellCommand(adjust);
}

async function composeArtwork(params) {
  const { template, artwork, mask, out, mode = 'over' } = params;
  const compose = `convert ${template} ${artwork} ${mask} -compose ${mode} -composite ${out}`;
  await execShellCommand(compose);
}

async function generateMockup(params) {
  const { artwork, template, displacementMap, lightingMap, adjustmentMap, mask, out, useOriginalCoords = true, useTiling = false } = params;
  const tmp = path.join(os.tmpdir(), `${Math.random().toString(36).substring(7)}.mpc`);
  const tmp2 = path.join(os.tmpdir(), `${Math.random().toString(36).substring(7)}.mpc`);
  
  if (useTiling) {
    // First tile the artwork to cover the mask area
    await tileArtwork({ artwork, mask, out: tmp });
    await addBorder({ artwork: tmp, out: tmp2 });
    await perspectiveTransform({ template, artwork: tmp2, mask, out: tmp2, useOriginalCoords, isTiled: true });
    fs.unlinkSync(tmp);
  } else {
    await addBorder({ artwork, out: tmp });
    await perspectiveTransform({ template, artwork: tmp, mask, out: tmp, useOriginalCoords, isTiled: false });
  }
  
  // await setBackgroundColor({ artwork: tmp, color: 'black', out: tmp });
  await addDisplacement({ artwork: useTiling ? tmp2 : tmp, displacementMap, out: useTiling ? tmp2 : tmp });
  await addHighlights({ artwork: useTiling ? tmp2 : tmp, lightingMap, out: useTiling ? tmp2 : tmp });
  await adjustColors({ artwork: useTiling ? tmp2 : tmp, adjustmentMap, out: useTiling ? tmp2 : tmp });
  await composeArtwork({ template, artwork: useTiling ? tmp2 : tmp, mask, out });
  
  fs.unlinkSync(useTiling ? tmp2 : tmp);
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

// Command line argument parsing
const args = process.argv.slice(2);
const useDynamic = args.includes('--dynamic') || args.includes('-d');
const disableTiling = args.includes('--no-tile') || args.includes('--single');
const useTiling = !disableTiling; // Tiling is now DEFAULT, use --no-tile to disable
const artworkArg = args.find(arg => arg.startsWith('--artwork=')) || args.find(arg => arg.startsWith('-a='));
const artworkFile = artworkArg ? artworkArg.split('=')[1] : "swatches/art9.jpg";

console.log(`Using ${useDynamic ? 'dynamic' : 'original'} coordinates`);
console.log(`Tiling: ${useTiling ? 'enabled (DEFAULT)' : 'disabled'}`);
console.log(`Artwork: ${artworkFile}`);

const mockups = {
  'out': getNextOutputFile(),
  'artwork': artworkFile,
  'template': 'base_images/template.jpg',
  'mask': 'base_images/mask.png',
  'displacementMap': 'maps/displacement_map.png',
  'lightingMap': 'maps/lighting_map.png',
  'adjustmentMap': 'maps/adjustment_map.jpg',
  'useOriginalCoords': !useDynamic,  // Use original coordinates unless --dynamic flag is set
  'useTiling': useTiling  // Tiling is now DEFAULT
}

generateMockup(mockups)