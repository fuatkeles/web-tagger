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
const admin = require('firebase-admin');
const config = require('./config');

const app = express();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: "googleapis.com"
    })
  });
}
const db = admin.firestore();

// Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://www.google-analytics.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://www.google-analytics.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser middleware with size limits
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ limit: process.env.MAX_FILE_SIZE || '10mb', extended: true }));

// Security Middleware
app.use(xss());
app.use(hpp());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Secure file upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    fieldSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific image types
    if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
      return cb(new Error('Only JPG, PNG & WebP files are allowed!'), false);
    }
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Invalid file extension!'), false);
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

// Credit management middleware
app.use(async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const docRef = db.collection('anonymous_credits').doc(clientIP);
    const doc = await docRef.get();
    const now = new Date().getTime();
    
    if (!doc.exists) {
      const creditInfo = {
        credits: 15,
        lastUsed: now,
        operations: []
      };
      await docRef.set(creditInfo);
      req.ipCredits = creditInfo;
    } else {
      const creditInfo = doc.data();
      const timeSinceLastUse = now - creditInfo.lastUsed;
      
      if (timeSinceLastUse >= 24 * 60 * 60 * 1000) {
        const resetInfo = {
          credits: 15,
          lastUsed: now,
          operations: []
        };
        await docRef.set(resetInfo);
        req.ipCredits = resetInfo;
      } else {
        req.ipCredits = creditInfo;
      }
    }
    next();
  } catch (error) {
    console.error('Firestore error:', error);
    next(error);
  }
});

// Get credits endpoint
app.get('/api/credits/anonymous', async (req, res) => {
  try {
    res.json({
      credits: req.ipCredits.credits,
      operations: req.ipCredits.operations
    });
  } catch (error) {
    console.error('Error getting credits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deduct credits endpoint
app.post('/api/credits/anonymous/deduct', async (req, res) => {
  try {
    const { amount, operationType } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    const creditInfo = req.ipCredits;

    if (!creditInfo || creditInfo.credits < amount) {
      return res.status(400).json({ 
        error: 'Insufficient credits',
        credits: creditInfo?.credits || 0
      });
    }

    const newCredits = creditInfo.credits - amount;
    const now = new Date().getTime();
    const operations = [...creditInfo.operations, {
      type: operationType,
      cost: amount,
      timestamp: new Date().toISOString()
    }];

    await db.collection('anonymous_credits').doc(clientIP).update({
      credits: newCredits,
      lastUsed: now,
      operations: operations
    });

    res.json({
      credits: newCredits,
      operations: operations
    });
  } catch (error) {
    console.error('Error deducting credits:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Error handler should be last
app.use(errorHandler);

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
