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
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

// In-memory credit storage with IP validation
const creditStorage = new Map();
const ipAttempts = new Map(); // Track suspicious IP behavior

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of creditStorage) {
    if (now - data.lastUsed > 24 * 60 * 60 * 1000) { // 24 hours
      creditStorage.delete(ip);
      ipAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Every hour

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strict rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024,
    fieldSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    // Allow both image/jpeg and image/jpg MIME types
    if (!file.mimetype.match(/^image\/(jpe?g|png|webp)$/)) {
      return cb(new Error('Only JPG, PNG & WebP files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Input validation middleware
const validateImageInput = [
  (req, res, next) => {
    // Get values from either body or FormData
    const latitude = req.body.latitude || req.file?.latitude;
    const longitude = req.body.longitude || req.file?.longitude;
    
    // Convert to float and validate
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Validate latitude
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ errors: [{ msg: 'Invalid latitude value: ' + latitude }] });
    }
    
    // Validate longitude
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ errors: [{ msg: 'Invalid longitude value: ' + longitude }] });
    }
    
    // Store parsed values
    req.geoData = {
      latitude: lat,
      longitude: lng
    };
    
    // Validate format if provided
    const format = (req.body.format || req.file?.format || '').toLowerCase();
    if (format && !['webp', 'png', 'jpg', 'jpeg'].includes(format)) {
      return res.status(400).json({ errors: [{ msg: 'Invalid format' }] });
    }
    
    next();
  }
];

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Detailed error:', err);
  console.error('Error stack:', err.stack);
  
  // Handle specific error types
  if (err.name === 'MulterError') {
    return res.status(400).json({
      status: 'error',
      message: 'File upload error: ' + err.message
    });
  }

  if (err.message.includes('Only JPG, PNG & WebP files are allowed')) {
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }

  // Default error response
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
};

// IP validation middleware
const validateIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Initialize or update IP attempts
  if (!ipAttempts.has(clientIP)) {
    ipAttempts.set(clientIP, {
      count: 0,
      firstAttempt: Date.now(),
      blocked: false
    });
  }

  const attempts = ipAttempts.get(clientIP);
  const now = Date.now();

  // Reset attempts after 1 hour
  if (now - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts.count = 0;
    attempts.firstAttempt = now;
    attempts.blocked = false;
  }

  // Check if IP is blocked
  if (attempts.blocked) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Increment attempt count
  attempts.count++;

  // Block IP if too many attempts
  if (attempts.count > 1000) { // 1000 requests per hour
    attempts.blocked = true;
    return res.status(403).json({ error: 'Too many requests, access denied' });
  }

  next();
};

// Credit management middleware
app.use('/api/credits', validateIP, (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  let creditInfo = creditStorage.get(clientIP);
  
  if (!creditInfo) {
    creditInfo = {
      credits: 15,
      lastUsed: now,
      operations: []
    };
    creditStorage.set(clientIP, creditInfo);
  } else {
    const timeSinceLastUse = now - creditInfo.lastUsed;
    
    if (timeSinceLastUse >= 24 * 60 * 60 * 1000) { // 24 hours
      creditInfo = {
        credits: 15,
        lastUsed: now,
        operations: []
      };
      creditStorage.set(clientIP, creditInfo);
    }
  }
  
  req.ipCredits = creditInfo;
  next();
});

// Remove anonymous credit endpoints
app.get('/api/credits/anonymous', (req, res) => {
  res.status(404).json({ error: 'Endpoint removed' });
});

app.post('/api/credits/anonymous/deduct', (req, res) => {
  res.status(404).json({ error: 'Endpoint removed' });
});

app.post('/add-geotag', upload.single('image'), validateImageInput, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No image file received');
    }

    const { latitude, longitude } = req.geoData;
    let format = (req.body.format || req.file.originalname.split('.').pop()).toLowerCase();
    // Normalize jpg/jpeg format
    format = format === 'jpg' ? 'jpeg' : format;
    const newFileName = (req.body.newFileName || 'geotagged').replace(/\s+/g, '-');
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}-${newFileName}.${format}`);

    try {
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

      // Write the processed file
      await fs.writeFile(tempFilePath, outputBuffer);

      // Convert coordinates to EXIF format
      const latAbs = Math.abs(latitude);
      const latDeg = Math.floor(latAbs);
      const latMin = Math.floor((latAbs - latDeg) * 60);
      const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(2);

      const lonAbs = Math.abs(longitude);
      const lonDeg = Math.floor(lonAbs);
      const lonMin = Math.floor((lonAbs - lonDeg) * 60);
      const lonSec = ((lonAbs - lonDeg - lonMin / 60) * 3600).toFixed(2);

      // Write GPS data
      const exifData = {
        GPSVersionID: [2, 2, 0, 0],
        GPSLatitudeRef: latitude >= 0 ? 'N' : 'S',
        GPSLatitude: [latDeg, latMin, latSec],
        GPSLongitudeRef: longitude >= 0 ? 'E' : 'W',
        GPSLongitude: [lonDeg, lonMin, lonSec],
        GPSMapDatum: 'WGS-84',
        GPSDateStamp: new Date().toISOString().split('T')[0].replace(/-/g, ':'),
        GPSTimeStamp: new Date().toISOString().split('T')[1].split('.')[0],
        GPSStatus: 'A'
      };

      // Write EXIF data
      await exiftool.write(tempFilePath, exifData, ['-overwrite_original']);

      // Read back and verify
      const info = await exiftool.read(tempFilePath);
      console.log('Written EXIF:', info);

      // Send the file
      const finalBuffer = await fs.readFile(tempFilePath);
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp'
      };

      const contentType = mimeTypes[format.toLowerCase()] || 'image/webp';
      const downloadFormat = format === 'jpeg' ? 'jpg' : format;
      
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${newFileName}.${downloadFormat}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.send(finalBuffer);

    } finally {
      // Clean up
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    next(error);
  }
});

app.post('/convert', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new Error('No image file received');
    }

    let format = req.body.format || 'webp';
    // Normalize jpg/jpeg format
    format = format.toLowerCase() === 'jpg' ? 'jpeg' : format.toLowerCase();
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
      
      const contentType = mimeTypes[format.toLowerCase()] || 'image/webp';
      const downloadFormat = format === 'jpeg' ? 'jpg' : format;
      
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${newFileName.replace(/\.[^/.]+$/, '')}.${downloadFormat}"`,
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

// API v1 routes
app.use('/v1', apiRoutes);

// Error handler should be last
app.use(errorHandler);

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});