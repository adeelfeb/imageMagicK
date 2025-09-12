import fs from "fs";
import path from "path";
import sharp from "sharp";

const swatchDir = path.join(process.cwd(), "swatches");
const outputDir = path.join(process.cwd(), "tiled_images");

// ensure output dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(swatchDir).filter(f =>
  f.toLowerCase().match(/\.(jpg|jpeg|png)$/)
);

if (files.length === 0) {
  console.error("❌ No swatches found in swatches/ folder.");
  process.exit(1);
}

console.log(`🖼️ Found ${files.length} swatch images, creating tiled image...`);

const gridSize = Math.ceil(Math.sqrt(files.length));
const tileSize = 450; // Increased from 300 to 450 for larger tiles

const canvasWidth = gridSize * tileSize;
const canvasHeight = gridSize * tileSize;

const createTile = async () => {
  // start with a blank white canvas
  let canvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  });

  const composites = [];

  for (let i = 0; i < files.length; i++) {
    const imgPath = path.join(swatchDir, files[i]);

    const x = (i % gridSize) * tileSize;
    const y = Math.floor(i / gridSize) * tileSize;

    composites.push({
      input: await sharp(imgPath).resize(tileSize, tileSize).toBuffer(),
      top: y,
      left: x
    });
  }

  const outputFile = path.join(outputDir, "tile.jpg");

  await canvas
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(outputFile);

  console.log(`✅ Tiled image saved to ${outputFile}`);
};

createTile().catch(err => {
  console.error("❌ Error creating tiled image:", err);
});
