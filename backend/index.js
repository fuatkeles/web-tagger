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

app.post('/add-geotag', upload.single('image'), validateImageInput, async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude, newFileName, format = 'webp' } = req.body;
    console.log('Received data:', { latitude, longitude, newFileName, format, file: req.file ? 'exists' : 'missing' });

    if (!req.file) {
      throw new Error('No image file received');
    }

    // Generate safe filename
    const safeFileName = path.basename(newFileName || 'image').replace(/[^a-z0-9]/gi, '_');
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}-${safeFileName}.${format}`);
    
    // Process image
    let imageBuffer;
    switch (format.toLowerCase()) {
      case 'png':
        imageBuffer = await sharp(req.file.buffer).png().toBuffer();
        break;
      case 'jpg':
        imageBuffer = await sharp(req.file.buffer).jpeg().toBuffer();
        break;
      default:
        imageBuffer = await sharp(req.file.buffer).webp().toBuffer();
    }
    await fs.writeFile(tempFilePath, imageBuffer);

    try {
      // Add geotag
      await exiftool.write(tempFilePath, {
        GPSLatitude: parseFloat(latitude),
        GPSLongitude: parseFloat(longitude),
        GPSLatitudeRef: parseFloat(latitude) >= 0 ? 'N' : 'S',
        GPSLongitudeRef: parseFloat(longitude) >= 0 ? 'E' : 'W'
      }, ['-overwrite_original']);

      const finalBuffer = await fs.readFile(tempFilePath);

      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'webp': 'image/webp'
      };

      // Set secure headers
      res.set({
        'Content-Type': mimeTypes[format.toLowerCase()] || 'image/webp',
        'Content-Disposition': `attachment; filename="${safeFileName}.${format}"`,
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

    const webpBuffer = await sharp(req.file.buffer).webp().toBuffer();
    
    res.set({
      'Content-Type': 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(webpBuffer);
  } catch (error) {
    next(error);
  }
});

// Apply error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
