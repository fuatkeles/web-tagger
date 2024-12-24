import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FaUpload, FaTimes, FaMapMarkerAlt, FaBars, FaCheckCircle } from 'react-icons/fa';
import './App.css';
import ReactDOMServer from 'react-dom/server';
import { ReactComponent as Logo } from './assets/WebTagger.svg';
import { ProgressBar } from 'react-loader-spinner';
import Navbar from './components/Navbar';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import { ThemeProvider } from './context/ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function LocationMarker({ location, setLocation }) {
  useMapEvents({
    click(e) {
      setLocation(e.latlng);
    },
  });

  return location ? (
    <Marker position={location} icon={L.divIcon({
      className: 'custom-icon',
      html: ReactDOMServer.renderToString(<FaMapMarkerAlt size={50} color="clack" />)
    })} />
  ) : null;
}

function SearchControl({ setLocation }) {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: true,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      marker: {
        icon: L.divIcon({
          className: 'custom-icon',
          html: ReactDOMServer.renderToString(<FaMapMarkerAlt size={50} color="black" />)
        })
      }
    });
    

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      if (result && result.location) {
        setLocation({
          lat: result.location.y,
          lng: result.location.x
        });
      }
    });

    return () => map.removeControl(searchControl);
  }, [map, setLocation]);

  return null;
}

function App() {
  const [images, setImages] = useState([]);
  const [convertedImages, setConvertedImages] = useState({});
  const [location, setLocation] = useState(null);
  const [geotagged, setGeotagged] = useState({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileNames, setFileNames] = useState([]);
  const [loading, setLoading] = useState({});
  const [menuActive, setMenuActive] = useState(false);
  const [fileFormats, setFileFormats] = useState([]);

  const toggleMenu = () => {
    setMenuActive(!menuActive);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setFileNames(files.map(file => file.name.split('.')[0]));
    setFileFormats(new Array(files.length).fill('webp'));
    setLoading(new Array(files.length).fill(false));
    setGeotagged(new Array(files.length).fill(false));
    setConvertedImages(new Array(files.length).fill(null));
  };

  const handleFormatChange = (index, format) => {
    const updatedFormats = [...fileFormats];
    updatedFormats[index] = format;
    setFileFormats(updatedFormats);
  };

  const handleFileNameChange = (index, newName) => {
    const updatedNames = [...fileNames];
    updatedNames[index] = newName;
    setFileNames(updatedNames);

    const updatedImages = [...images];
    const file = updatedImages[index];
    const extension = file.name.split('.').pop();
    Object.defineProperty(file, 'name', {
      writable: true,
      value: `${newName}.${extension}`
    });
    setImages(updatedImages);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setImages(files);
    setFileNames(files.map(file => file.name.replace(/\.[^/.]+$/, "")));
    setIsDragActive(false);
  };

  
  const handleConvert = async (index) => {
    const formData = new FormData();
    formData.append('image', images[index]);

    try {
      const response = await axios.post('https://web-tagger-backend.onrender.com/convert', formData, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      setConvertedImages((prev) => ({ ...prev, [index]: url }));
    } catch (error) {
      console.error('Error converting image:', error);
    }
  };

  const handleAddGeotag = async (index) => {
    const originalFileName = fileNames[index];
    const newFileName = originalFileName.replace(/\s+/g, '-');
    const format = fileFormats[index] || 'webp';

    if (!location) {
      console.error('Location is not set');
      return;
    }

    setLoading((prev) => ({ ...prev, [index]: true }));
    
    const formData = new FormData();
    formData.append('image', images[index]);
    formData.append('latitude', location.lat);
    formData.append('longitude', location.lng);
    formData.append('format', format);
    if (newFileName) {
      formData.append('newFileName', newFileName);
    }

    try {
      const response = await axios.post(`${API_URL}/add-geotag`, formData, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const altText = originalFileName;
      setConvertedImages((prev) => ({ ...prev, [index]: { url, altText } }));
      setGeotagged((prev) => ({ ...prev, [index]: true }));
    } catch (error) {
      console.error('Error adding geotag:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleClear = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setConvertedImages((prev) => {
      const newConvertedImages = { ...prev };
      delete newConvertedImages[index];
      return newConvertedImages;
    });
    setGeotagged((prev) => {
      const newGeotagged = { ...prev };
      delete newGeotagged[index];
      return newGeotagged;
    });
  };

  const handleClearAll = () => {
    setImages([]);
    setConvertedImages({});
    setGeotagged({});
  };

  const getWebpFileName = (originalName, newFileName) => {
    if (newFileName) {
      const sanitizedFileName = newFileName.replace(/\s+/g, '-');
      return `${sanitizedFileName}.webp`;
    }
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "-");
    return `${nameWithoutExtension}.webp`;
  };
  

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("images");
  
    for (const [index, imageData] of Object.entries(convertedImages)) {
      try {
        const response = await fetch(imageData.url);
  
        if (!response.ok) {
          console.error(`Failed to fetch image at index ${index}: ${response.statusText}`);
          continue;
        }
  
        const contentType = response.headers.get("Content-Type");
        if (!contentType || !contentType.includes("image")) {
          console.error(`Unexpected content type at index ${index}: ${contentType}`);
          continue;
        }
  
        const blob = await response.blob();
        const baseFileName = fileNames[index].split('.')[0].replace(/\s+/g, '-');
        const format = fileFormats[index] || 'webp';
        folder.file(`${baseFileName}.${format}`, blob);
      } catch (error) {
        console.error(`Error fetching image at index ${index}: ${error.message}`);
      }
    }
  
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "images.zip");
    });
  };
  
  
  
  

  const allConvertedAndGeotagged = images.length > 0 && images.every((_, index) => geotagged[index]);

  useEffect(() => {
    setFileNames(images.map(img => img.name));
  }, [images]);

  return (
    <Router>
      <ThemeProvider>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route path="/" element={
              <Home 
                location={location}
                setLocation={setLocation}
                isDragActive={isDragActive}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleFileChange={handleFileChange}
                images={images}
                fileNames={fileNames}
                handleFileNameChange={handleFileNameChange}
                loading={loading}
                handleAddGeotag={handleAddGeotag}
                geotagged={geotagged}
                convertedImages={convertedImages}
                handleClear={handleClear}
                handleDownloadAll={handleDownloadAll}
                handleClearAll={handleClearAll}
                allConvertedAndGeotagged={allConvertedAndGeotagged}
                fileFormats={fileFormats}
                handleFormatChange={handleFormatChange}
              />
            } />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;
