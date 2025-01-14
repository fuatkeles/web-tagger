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
const Redis = require('ioredis');
const config = require('./config');

const app = express();

// Body parser middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Security Middleware
app.use(helmet());
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [config.frontendUrl, 'https://www.exifquarter.com', 'https://exifquarter.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  credentials: true,
  maxAge: 86400
}));

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB limit
    fieldSize: 100 * 1024 * 1024 // 100MB limit for form fields
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

// Redis Configuration
const redisOptions = {
  ...config.redis,
  retryStrategy: function(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  autoResubscribe: true
};

let redis = null;

const initRedis = () => {
  try {
    redis = new Redis(config.redis.url || redisOptions);

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Successfully connected to Redis');
    });

    redis.on('ready', () => {
      console.log('Redis is ready to accept commands');
    });

    redis.on('reconnecting', () => {
      console.log('Reconnecting to Redis...');
    });

    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
};

redis = initRedis();

// Middleware to track IP-based credits with fallback
app.use(async (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const key = `credits:${clientIP}`;
  
  try {
    if (!redis || redis.status !== 'ready') {
      console.log('Redis not ready, using fallback');
      req.ipCredits = {
        credits: 15,
        lastUsed: new Date().getTime(),
        operations: []
      };
      return next();
    }

    let creditInfo = await redis.get(key);
    
    if (!creditInfo) {
      creditInfo = {
        credits: 15,
        lastUsed: new Date().getTime(),
        operations: []
      };
      await redis.set(key, JSON.stringify(creditInfo));
    } else {
      try {
        creditInfo = JSON.parse(creditInfo);
      } catch (e) {
        console.error('Error parsing credit info:', e);
        creditInfo = {
          credits: 15,
          lastUsed: new Date().getTime(),
          operations: []
        };
        await redis.set(key, JSON.stringify(creditInfo));
      }
      
      // Check if 24 hours passed since last use
      const now = new Date().getTime();
      const timeSinceLastUse = now - creditInfo.lastUsed;
      
      if (timeSinceLastUse >= 24 * 60 * 60 * 1000) { // 24 hours
        creditInfo = {
          credits: 15,
          lastUsed: now,
          operations: []
        };
        await redis.set(key, JSON.stringify(creditInfo));
      }
    }
    
    req.ipCredits = creditInfo;
  } catch (error) {
    console.error('Redis operation error:', error);
    // Fallback to in-memory credits if Redis fails
    req.ipCredits = {
      credits: 15,
      lastUsed: new Date().getTime(),
      operations: []
    };
  }
  next();
});

// Endpoint to get credits for non-logged users with error handling
app.get('/api/credits/anonymous', async (req, res) => {
  try {
    res.json({
      credits: req.ipCredits.credits,
      operations: req.ipCredits.operations
    });
  } catch (error) {
    console.error('Error getting anonymous credits:', error);
    res.status(500).json({
      credits: 15,
      operations: [],
      error: 'Internal server error'
    });
  }
});

// Endpoint to deduct credits for non-logged users with better error handling
app.post('/api/credits/anonymous/deduct', async (req, res) => {
  const { amount, operationType } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const key = `credits:${clientIP}`;
  const creditInfo = req.ipCredits;

  if (!creditInfo || creditInfo.credits < amount) {
    return res.status(400).json({ 
      error: 'Insufficient credits',
      credits: creditInfo?.credits || 0
    });
  }

  try {
    let isRedisConnected = redis.status === 'ready';
    if (!isRedisConnected) {
      throw new Error('Redis not connected');
    }

    creditInfo.credits -= amount;
    creditInfo.lastUsed = new Date().getTime();
    creditInfo.operations.push({
      type: operationType,
      cost: amount,
      timestamp: new Date().toISOString()
    });

    await redis.set(key, JSON.stringify(creditInfo));

    res.json({
      credits: creditInfo.credits,
      operations: creditInfo.operations
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      credits: req.ipCredits.credits
    });
  }
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

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
