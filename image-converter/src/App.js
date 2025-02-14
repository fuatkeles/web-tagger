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

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit

  const toggleMenu = () => {
    setMenuActive(!menuActive);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Following files are too large (max 100MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

    setImages(files);
    setFileNames(files.map(file => file.name.split('.')[0]));
    // Set initial format based on file extension
    setFileFormats(files.map(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension.replace('jpeg', 'jpg') : 'webp';
    }));
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
      alert(`Following files are too large (max 100MB):\n${oversizedFiles.map(f => f.name).join('\n')}`);
      return;
    }

    setImages(files);
    setFileNames(files.map(file => file.name.replace(/\.[^/.]+$/, "")));
    // Set initial format based on file extension
    setFileFormats(files.map(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension.replace('jpeg', 'jpg') : 'webp';
    }));
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

    if (images[index].size > MAX_FILE_SIZE) {
      alert('File is too large to process (max 100MB). Please try with a smaller file.');
      return;
    }

    setLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      const format = fileFormats[index] || 'webp';
      const cleanFileName = fileNames[index]
        .replace(/\.(png|jpe?g|webp)$/i, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-');
      const fileName = `${cleanFileName}.${format}`;

      console.log('Location data:', location);
      console.log('Latitude:', location.lat);
      console.log('Longitude:', location.lng);

      const formData = new FormData();
      formData.append('image', images[index]);
      formData.append('latitude', String(location.lat));
      formData.append('longitude', String(location.lng));
      formData.append('format', format);
      formData.append('newFileName', fileName);

      // Log FormData contents
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axios.post(`${API_URL}/add-geotag`, formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000 // 30 second timeout
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('Request error:', error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('Error message:', error.message);
        }
        throw error;
      });

      const blob = new Blob([response.data], { type: `image/${format}` });
      
      // Cleanup previous URL if exists
      if (convertedImages[index]?.url) {
        URL.revokeObjectURL(convertedImages[index].url);
      }
      
      const url = URL.createObjectURL(blob);
      setConvertedImages(prev => ({
        ...prev,
        [index]: {
          url,
          format,
          geotagged: true,
          modified: true,
          location: {
            lat: location.lat,
            lng: location.lng
          }
        }
      }));
      setGeotagged(prev => ({ ...prev, [index]: true }));
    } catch (error) {
      console.error('Error adding geotag:', error);
      alert('Failed to add geotag. Check browser console for details.');
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
      if (images[index].size > MAX_FILE_SIZE) {
        alert('File is too large to process (max 100MB). Please try with a smaller file.');
        return;
      }

      const image = images[index];
      const currentFormat = fileFormats[index] || 'webp';
      const cleanFileName = fileNames[index]
        .replace(/\.(png|jpe?g|webp)$/i, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '-');
      const fileName = `${cleanFileName}.${currentFormat}`;

      // Check if format is different from original
      const originalFormat = image.name.split('.').pop().toLowerCase();
      const needsFormatConversion = currentFormat !== originalFormat;

      // If format needs conversion, convert first
      let processedImage = image;
      if (needsFormatConversion) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('format', currentFormat);
        formData.append('newFileName', fileName);

        const response = await axios.post(`${API_URL}/convert`, formData, {
          responseType: 'blob',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000
        });

        const blob = new Blob([response.data], { type: `image/${currentFormat}` });
        processedImage = new File([blob], fileName, { type: `image/${currentFormat}` });
      }

      // If image has geotag, add geotag to the processed image
      if (geotagged[index]) {
        const formData = new FormData();
        formData.append('image', processedImage);
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lng.toString());
        formData.append('format', currentFormat);
        formData.append('newFileName', fileName);

        const response = await fetch(`${API_URL}/add-geotag`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // If only format conversion was needed, use the processed image
      if (needsFormatConversion) {
        const downloadUrl = URL.createObjectURL(processedImage);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        return;
      }

      // If no changes needed, use original file
      const downloadUrl = URL.createObjectURL(image);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("images");
    let processedCount = 0;
    const promises = [];

    for (let index = 0; index < images.length; index++) {
      promises.push((async () => {
        try {
          const image = images[index];
          const currentFormat = fileFormats[index] || 'webp';
          const originalFormat = image.name.split('.').pop().toLowerCase();
          const needsFormatConversion = currentFormat !== originalFormat;
          const cleanFileName = fileNames[index]
            .replace(/\.(png|jpe?g|webp)$/i, '')
            .replace(/\.[^/.]+$/, '')
            .replace(/\s+/g, '-');
          const fileName = `${cleanFileName}.${currentFormat}`;

          let processedImage = image;
          let blob;

          // If format needs conversion, convert first
          if (needsFormatConversion) {
            const formData = new FormData();
            formData.append('image', image);
            formData.append('format', currentFormat);
            formData.append('newFileName', fileName);

            const response = await axios.post(`${API_URL}/convert`, formData, {
              responseType: 'blob',
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 30000
            });
            
            const responseBlob = new Blob([response.data], { type: `image/${currentFormat}` });
            processedImage = new File([responseBlob], fileName, { type: `image/${currentFormat}` });
          }

          // If image has geotag, add geotag to the processed image
          if (geotagged[index]) {
            const formData = new FormData();
            formData.append('image', processedImage);
            formData.append('latitude', location.lat.toString());
            formData.append('longitude', location.lng.toString());
            formData.append('format', currentFormat);
            formData.append('newFileName', fileName);

            const response = await fetch(`${API_URL}/add-geotag`, {
              method: 'POST',
              body: formData
            });

            if (!response.ok) {
              throw new Error('Failed to fetch geotagged image');
            }
            blob = await response.blob();
          } else {
            // If no geotag needed, use the processed or original image
            blob = processedImage instanceof File ? await processedImage.arrayBuffer() : await processedImage.arrayBuffer();
            blob = new Blob([blob], { type: `image/${currentFormat}` });
          }

          if (blob) {
            folder.file(fileName, blob);
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing image at index ${index}:`, error);
        }
      })());
    }

    try {
      await Promise.all(promises);

      if (processedCount > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', "images.zip");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert('No processed images to download. Please modify at least one image first.');
      }
    } catch (error) {
      console.error('Error generating zip file:', error);
      alert('Error creating zip file. Please try again.');
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
            <div className="app">
              <Navbar />
              <Routes>
                <Route 
                  path="/" 
                  element={
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
                      setLoading={setLoading}
                      geotagged={geotagged}
                      convertedImages={convertedImages}
                      setConvertedImages={setConvertedImages}
                      setGeotagged={setGeotagged}
                      handleClear={handleClear}
                      handleDownloadAll={handleDownloadAll}
                      handleClearAll={handleClearAll}
                      allConvertedAndGeotagged={allConvertedAndGeotagged}
                      fileFormats={fileFormats}
                      handleFormatChange={handleFormatChange}
                      handleAddGeotag={handleAddGeotag}
                      handleDownload={handleDownload}
                    />
                  } 
                />
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
