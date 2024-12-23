# Web Tagger Image Converter

A web application for converting images and adding geolocation data to them.

## Features

- Image format conversion (WebP, PNG, JPG)
- Geolocation tagging
- Interactive map for location selection
- Batch processing
- Dark/Light theme support

## Technologies

- React.js
- Node.js
- Express
- Sharp
- ExifTool
- Leaflet Maps

## Installation

### Frontend

```bash
cd image-converter
npm install
npm start
```

### Backend

```bash
cd backend
npm install
npm start
```

## Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_API_URL=http://localhost:5001
```

## Usage

1. Upload images by dragging and dropping or using the file selector
2. Select a location on the map
3. Choose output format for each image
4. Click "Add Geotag" to process images
5. Download processed images individually or all at once

## License

MIT 