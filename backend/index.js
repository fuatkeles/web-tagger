const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const exiftool = require('exiftool-vendored').exiftool;
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage()
});

app.post('/add-geotag', upload.single('image'), async (req, res) => {
  try {
    const { latitude, longitude, newFileName, format = 'webp' } = req.body;
    console.log('Received data:', { latitude, longitude, newFileName, format, file: req.file ? 'exists' : 'missing' });

    if (!req.file) {
      throw new Error('No image file received');
    }

    // Geçici dosya oluştur
    const tempFilePath = path.join(__dirname, `temp-${Date.now()}.${format}`);
    
    // Resmi istenilen formata çevir ve kaydet
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
      // Geotag ekle
      await exiftool.write(tempFilePath, {
        GPSLatitude: parseFloat(latitude),
        GPSLongitude: parseFloat(longitude),
        GPSLatitudeRef: parseFloat(latitude) >= 0 ? 'N' : 'S',
        GPSLongitudeRef: parseFloat(longitude) >= 0 ? 'E' : 'W'
      }, ['-overwrite_original']);

      // İşlenmiş dosyayı oku
      const finalBuffer = await fs.readFile(tempFilePath);

      // MIME tiplerini ayarla
      const mimeTypes = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'webp': 'image/webp'
      };

      // Dosyayı gönder
      res.set('Content-Type', mimeTypes[format.toLowerCase()] || 'image/webp');
      res.set('Content-Disposition', `attachment; filename="${newFileName || 'image'}.${format}"`);
      res.send(finalBuffer);

    } finally {
      // Geçici dosyayı temizle
      try {
        await fs.unlink(tempFilePath);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }

  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    const webpBuffer = await sharp(req.file.buffer).webp().toBuffer();
    res.set('Content-Type', 'image/webp');
    res.send(webpBuffer);
  } catch (error) {
    console.error('Error converting image:', error);
    res.status(500).send('Error converting image');
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
