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
import Footer from './components/Footer';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import { CreditsProvider } from './context/CreditsContext';
import Pricing from './pages/Pricing';

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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Following files are too large (max 10MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

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
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Following files are too large (max 10MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

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
    if (!location) {
      alert('Please select a location on the map first');
      return;
    }

    // Check file size before processing
    if (images[index].size > MAX_FILE_SIZE) {
      alert('File is too large to process (max 10MB). Please try with a smaller file.');
      return;
    }

    setLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      // Get the current file name and format
      const format = fileFormats[index] || 'webp';
      const cleanFileName = fileNames[index]
        .replace(/\.(png|jpe?g|webp)$/i, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-');
      const fileName = `${cleanFileName}.${format}`;

      const formData = new FormData();
      formData.append('image', images[index]);
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lng.toString());
      formData.append('format', format);
      formData.append('newFileName', fileName);

      const response = await axios.post(`${API_URL}/add-geotag`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }).catch(error => {
        if (error.response && error.response.status === 413) {
          throw new Error('File is too large to process. Please try with a smaller file.');
        }
        throw error;
      });

      // Create a blob with the correct type
      const blob = new Blob([response.data], { type: `image/${format}` });
      const url = URL.createObjectURL(blob);
      
      // Update convertedImages with the geotagged version
      const newConvertedImages = { ...convertedImages };
      newConvertedImages[index] = {
        url,
        format,
        geotagged: true,
        modified: true,
        location: {
          lat: location.lat,
          lng: location.lng
        }
      };
      setConvertedImages(newConvertedImages);
      setGeotagged(prev => ({ ...prev, [index]: true }));
    } catch (error) {
      alert(error.message || 'Error adding geotag. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [index]: false }));
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
  

  const handleDownload = async (index) => {
    try {
      // Check file size before processing
      if (images[index].size > MAX_FILE_SIZE) {
        alert('File is too large to process (max 10MB). Please try with a smaller file.');
        return;
      }

      const image = images[index];
      const format = fileFormats[index] || 'webp';
      const cleanFileName = fileNames[index]
        .replace(/\.(png|jpe?g|webp)$/i, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-');
      const fileName = `${cleanFileName}.${format}`;

      // If the image has been modified (geotagged or converted), use that version
      if (convertedImages[index]?.url) {
        const response = await fetch(convertedImages[index].url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        return;
      }

      // If not modified yet, convert and download
      const formData = new FormData();
      formData.append('image', image);
      formData.append('format', format);
      formData.append('newFileName', fileName);

      const response = await axios.post(`${API_URL}/convert`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }).catch(error => {
        if (error.response && error.response.status === 413) {
          throw new Error('File is too large to process. Please try with a smaller file.');
        }
        throw error;
      });

      const blob = new Blob([response.data], { type: `image/${format}` });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Store the converted version
      const newConvertedImages = { ...convertedImages };
      newConvertedImages[index] = {
        url: url,
        format: format,
        modified: true
      };
      setConvertedImages(newConvertedImages);
    } catch (error) {
      alert('Error downloading file. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("images");
    let processedCount = 0;

    // Process each image
    for (let index = 0; index < images.length; index++) {
      // Check if the image has been modified in any way (converted, geotagged, renamed, or format changed)
      const hasModifiedFormat = fileFormats[index] !== images[index].name.split('.').pop();
      const hasModifiedName = fileNames[index] !== images[index].name.split('.')[0];
      const hasBeenConverted = convertedImages[index]?.url;
      const hasBeenGeotagged = geotagged[index];

      if (!hasModifiedFormat && !hasModifiedName && !hasBeenConverted && !hasBeenGeotagged) {
        continue;
      }

      try {
        let blob;
        if (hasBeenConverted || hasBeenGeotagged) {
          // Use the converted/geotagged version if available
          const response = await fetch(convertedImages[index].url);
          if (!response.ok) {
            continue;
          }
          blob = await response.blob();
        } else {
          // Convert the image with new format/name
          const format = fileFormats[index] || 'webp';
          const cleanFileName = fileNames[index]
            .replace(/\.(png|jpe?g|webp)$/i, '')
            .replace(/\.[^/.]+$/, '')
            .replace(/\s+/g, '-');
          const fileName = `${cleanFileName}.${format}`;

          const formData = new FormData();
          formData.append('image', images[index]);
          formData.append('format', format);
          formData.append('newFileName', fileName);

          const response = await axios.post(`${API_URL}/convert`, formData, {
            responseType: 'blob',
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          blob = new Blob([response.data], { type: `image/${format}` });
        }

        // Add to zip
        const baseFileName = fileNames[index].split('.')[0].replace(/\s+/g, '-');
        const format = fileFormats[index] || 'webp';
        folder.file(`${baseFileName}.${format}`, blob);
        processedCount++;
      } catch (error) {
      }
    }

    if (processedCount > 0) {
      zip.generateAsync({ type: "blob" }).then((content) => {
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', "images.zip");
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
    } else {
      alert('No processed images to download. Please modify at least one image first.');
    }
  };
  
  
  
  

  const allConvertedAndGeotagged = images.length > 0 && images.every((_, index) => geotagged[index]);

  useEffect(() => {
    setFileNames(images.map(img => img.name));
  }, [images]);

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <CreditsProvider>
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
                    handleDownload={handleDownload}
                  />
                } />
                <Route path="/about" element={<About />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pricing" element={<Pricing />} />
              </Routes>
              <Footer />
            </div>
          </CreditsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
