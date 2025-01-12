const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const exiftool = require('exiftool-vendored').exiftool;
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const xss = require('xss-clean');
const hpp = require('hpp');
require('dotenv').config();

const app = express();

// Body parser middleware
app.use(express.json());

// Security Middleware
app.use(helmet());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific image types
    if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
      return cb(new Error('Only JPG, PNG & WebP files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Input validation middleware
const validateImageInput = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('format').optional().isIn(['webp', 'png', 'jpg']).withMessage('Invalid format'),
  body('newFileName').optional().trim().escape()
];

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
};

// IP based credit tracking for non-logged users
const ipCredits = new Map();

// Middleware to track IP-based credits
app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!ipCredits.has(clientIP)) {
    ipCredits.set(clientIP, {
      credits: 15,
      lastUsed: new Date().getTime(),
      operations: []
    });
  }
  req.ipCredits = ipCredits.get(clientIP);
  next();
});

// Endpoint to get credits for non-logged users
app.get('/api/credits/anonymous', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const creditInfo = ipCredits.get(clientIP);
  
  // Check if 24 hours passed since last use
  const now = new Date().getTime();
  if (creditInfo && creditInfo.lastUsed) {
    const timeSinceLastUse = now - creditInfo.lastUsed;
    if (timeSinceLastUse >= 24 * 60 * 60 * 1000) { // 24 hours
      creditInfo.credits = 15;
      creditInfo.lastUsed = now;
    }
  }
  
  res.json({
    credits: creditInfo.credits,
    operations: creditInfo.operations
  });
});

// Endpoint to deduct credits for non-logged users
app.post('/api/credits/anonymous/deduct', (req, res) => {
  const { amount, operationType } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const creditInfo = ipCredits.get(clientIP);
  
  if (!creditInfo || creditInfo.credits < amount) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }
  
  creditInfo.credits -= amount;
  creditInfo.lastUsed = new Date().getTime();
  creditInfo.operations.push({
    type: operationType,
    cost: amount,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    credits: creditInfo.credits,
    operations: creditInfo.operations
  });
});

app.post('/add-geotag', upload.single('image'), validateImageInput, async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, format = 'webp' } = req.body;
    const newFileName = req.body.newFileName?.replace(/\s+/g, '-') || 'geotagged';
    
    // Get clean filename without extension and hyphens for metadata
    const cleanFileName = newFileName
      .replace(/\.[^/.]+$/, '')        // remove extension
      .replace(/-/g, ' ');             // replace hyphens with spaces

    if (!req.file) {
      throw new Error('No image file received');
    }

    // First convert the image to the desired format
    let processedImage;
    switch (format.toLowerCase()) {
      case 'png':
        processedImage = await sharp(req.file.buffer).png();
        break;
      case 'jpg':
      case 'jpeg':
        processedImage = await sharp(req.file.buffer).jpeg();
        break;
      case 'webp':
      default:
        processedImage = await sharp(req.file.buffer).webp();
        break;
    }

    const outputBuffer = await processedImage.toBuffer();
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}-${newFileName}.${format}`);
    
    // Write the processed image to a temporary file
    await fs.writeFile(tempFilePath, outputBuffer);

    try {
      // Add geotag data
      await exiftool.write(tempFilePath, {
        GPSLatitude: parseFloat(latitude),
        GPSLongitude: parseFloat(longitude),
        GPSLatitudeRef: parseFloat(latitude) >= 0 ? 'N' : 'S',
        GPSLongitudeRef: parseFloat(longitude) >= 0 ? 'E' : 'W',
        GPSVersionID: '2.3.0.0',
        GPSMapDatum: 'WGS-84',
        Software: 'Exif Quarter',
        ImageDescription: cleanFileName,
        Keywords: cleanFileName
      }, ['-overwrite_original']);

      // Read the geotagged file
      const finalBuffer = await fs.readFile(tempFilePath);

      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      };

      // Set response headers
      res.set({
        'Content-Type': mimeTypes[format.toLowerCase()] || 'image/webp',
        'Content-Disposition': `attachment; filename="${newFileName}.${format}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(finalBuffer);

    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }

  } catch (error) {
    console.error('Detailed error:', error);
    next(error);
  }
});

app.post('/convert', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No image file received');
    }

    const format = req.body.format || 'webp';
    const newFileName = req.body.newFileName?.replace(/\s+/g, '-') || `converted.${format}`;

    // First convert the image to the desired format
    let processedImage;
    switch (format.toLowerCase()) {
      case 'png':
        processedImage = await sharp(req.file.buffer).png();
        break;
      case 'jpg':
      case 'jpeg':
        processedImage = await sharp(req.file.buffer).jpeg();
        break;
      case 'webp':
      default:
        processedImage = await sharp(req.file.buffer).webp();
        break;
    }

    const outputBuffer = await processedImage.toBuffer();

    // Create a temporary file to process the image
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}-${newFileName}`);
    await fs.writeFile(tempFilePath, outputBuffer);

    try {
      // Add basic metadata
      await exiftool.write(tempFilePath, {
        Software: 'Exif Quarter',
        ImageDescription: newFileName.replace(/\.[^/.]+$/, '').replace(/-/g, ' '),
        Keywords: newFileName.replace(/\.[^/.]+$/, '').replace(/-/g, ' ')
      }, ['-overwrite_original']);

      // Read the processed file
      const finalBuffer = await fs.readFile(tempFilePath);

      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      };
      
      res.set({
        'Content-Type': mimeTypes[format.toLowerCase()] || 'image/webp',
        'Content-Disposition': `attachment; filename="${newFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.send(finalBuffer);
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  } catch (error) {
    console.error('Detailed conversion error:', error);
    next(error);
  }
});

// Apply error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
