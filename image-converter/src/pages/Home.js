import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { FaUpload, FaTimes, FaCheckCircle, FaImage, FaMapMarkerAlt, FaCoins, FaGoogle, FaRocket } from 'react-icons/fa';
import LocationMarker from '../components/LocationMarker';
import SearchControl from '../components/SearchControl';
import './Home.css';
import { useAuth } from '../context/AuthContext';
import { useCredits } from '../context/CreditsContext';
import { useNavigate } from 'react-router-dom';
import CreditAlert from '../components/CreditAlert';

const FREE_CREDITS = 10;

const ImageListItem = ({ 
  image, 
  fileName, 
  onFileNameChange, 
  onFormatChange,
  loading,
  setLoading,
  geotagged,
  location,
  onRemove,
  selectedFormat,
  convertedUrl,
  onDownload,
  showCreditAlert,
  setShowCreditAlert,
  index,
  setConvertedImages,
  setGeotagged
}) => {
  const [name, setName] = useState(fileName.replace(/\.[^/.]+$/, ""));
  const [isConverted, setIsConverted] = useState(false);
  const [hasFormatChanged, setHasFormatChanged] = useState(false);
  const { deductCredits, getOperationCost, credits } = useCredits();
  const { user } = useAuth();

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    onFileNameChange(newName);
    setIsConverted(true);
  };

  const handleFormatChange = async (format) => {
    if (hasFormatChanged) {
      // If format has already been changed once, don't charge credits
      onFormatChange(format);
      return;
    }

    const cost = getOperationCost('format');
    
    if (credits < cost) {
      if (!user) {
        setShowCreditAlert(true);
        return;
      } else {
        alert('Insufficient credits. Please wait for credit renewal.');
        return;
      }
    }
    
    if (await deductCredits(cost, 'format')) {
      onFormatChange(format);
      setIsConverted(true);
      setHasFormatChanged(true);
    }
  };

  // Update isConverted when convertedUrl or geotagged changes
  useEffect(() => {
    if (convertedUrl || geotagged) {
      setIsConverted(true);
    }
  }, [convertedUrl, geotagged]);

  const handleAddGeotagWithCredits = async () => {
    const cost = getOperationCost('geotag');
    
    if (credits < cost) {
      if (!user) {
        setShowCreditAlert(true);
        return;
      } else {
        alert('Insufficient credits. Please wait for credit renewal.');
        return;
      }
    }

    if (!location) {
      alert('Please select a location on the map first');
      return;
    }

    try {
      if (await deductCredits(cost, 'geotag')) {
        // Set loading state for this image
        setLoading(prev => ({ ...prev, [index]: true }));

        const formData = new FormData();
        formData.append('image', image);
        formData.append('latitude', location.lat.toString());
        formData.append('longitude', location.lng.toString());
        formData.append('format', selectedFormat || 'webp');
        formData.append('newFileName', name);

        // Log FormData contents for debugging
        for (let pair of formData.entries()) {
          console.log('FormData:', pair[0], pair[1]);
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/add-geotag`, {
          method: 'POST',
          body: formData,
        });

        // Log the full response for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Update states directly
        setConvertedImages(prev => ({ ...prev, [index]: { url } }));
        setGeotagged(prev => ({ ...prev, [index]: true }));
        setIsConverted(true);
      }
    } catch (error) {
      console.error('Detailed error:', error);
      console.error('Error stack:', error.stack);
      alert(`Failed to add geotag: ${error.message}`);
    } finally {
      // Reset loading state
      setLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="image-list-item">
      <div className="image-preview">
        <img src={URL.createObjectURL(image)} alt={fileName} />
      </div>
      
      <div className="image-details">
        <div className="filename-group">
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            className="filename-input"
            placeholder="Enter file name"
          />
          <select 
            className="format-select"
            onChange={(e) => handleFormatChange(e.target.value)}
            value={selectedFormat}
          >
            <option value="webp">webp</option>
            <option value="png">png</option>
            <option value="jpg">jpg</option>
          </select>
        </div>

        <div className="action-buttons">
          {location && (
            <button 
              className="geotag-button"
              onClick={handleAddGeotagWithCredits}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="button-spinner" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <FaMapMarkerAlt />
                  {geotagged ? 'Update Geotag' : 'Add Geotag'}
                </>
              )}
            </button>
          )}

          <button 
            onClick={onDownload}
            className="download-button"
          >
            <FaCheckCircle />
            Download
          </button>

          <button className="remove-button" onClick={onRemove}>
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

const Home = ({ 
  location, 
  setLocation, 
  isDragActive, 
  handleDragOver, 
  handleDragLeave, 
  handleDrop, 
  handleFileChange,
  images,
  fileNames,
  handleFileNameChange,
  loading,
  setLoading,
  geotagged,
  convertedImages,
  setConvertedImages,
  setGeotagged,
  handleClear,
  handleDownloadAll: originalHandleDownloadAll,
  handleClearAll,
  allConvertedAndGeotagged,
  fileFormats,
  handleFormatChange,
  handleAddGeotag: originalHandleAddGeotag,
  handleDownload
}) => {
  const { user, signInWithGoogle, isPromotionActive } = useAuth();
  const { credits, getOperationCost, deductCredits } = useCredits();
  const navigate = useNavigate();
  const [showCreditAlert, setShowCreditAlert] = useState(false);

  const handleDownloadWithCredits = async (index) => {
    // Single file download is free
    await handleDownload(index);
  };

  const handleDownloadAll = async () => {
    const cost = getOperationCost('download_all', images.length);
    
    if (cost > 0 && credits < cost) {
      if (!user) {
        setShowCreditAlert(true);
        return;
      } else {
        alert('Insufficient credits. Please wait for credit renewal.');
        return;
      }
    }

    if (cost === 0 || await deductCredits(cost, 'download_all')) {
      await originalHandleDownloadAll();
    }
  };

  return (
    <div className="home">
      <div className="container">
        <header className="home-header">
          <h1>Image Converter with EXIF Data Writer</h1>
          <div className="seo-benefits">
            <p className="seo-text">
              Boost your SEO rankings with proper EXIF metadata. Search engines use image metadata to better understand and rank your content. 
              Adding location data, descriptions, and technical details helps your images appear in relevant searches.
            </p>
          </div>
        </header>

        {!user && isPromotionActive && (
          <div className="credits-status left">
            <div className="credits-count">
              <FaRocket className="rocket-icon" />
              <span className="promo-count">EARN 20X!</span>
            </div>
            <div className="credits-extra">
              <span className="promotion-text">First 100 users get 200 credits! 🎉</span>
              <button onClick={signInWithGoogle} className="credits-login">
                <FaGoogle /> Join Now
              </button>
            </div>
          </div>
        )}

        <div className="credits-status">
          <div className="credits-count">
            <FaCoins />
            <span>{credits}</span>
          </div>
          {!user ? (
            <div className="credits-extra">
              <span className="credits-reset">Daily Free Credits</span>
              <button onClick={signInWithGoogle} className="credits-login">
                <FaGoogle /> Get More Credits
              </button>
            </div>
          ) : (
            <div className="credits-extra">
              <span className="credits-reset">Need more?</span>
              <button onClick={() => navigate('/pricing')} className="credits-login">
                Upgrade Plan
              </button>
            </div>
          )}
        </div>

        <section className="tools-section">
          <div className="map-box">
            <MapContainer 
              center={[51.505, -0.09]} 
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker location={location} setLocation={setLocation} />
              <SearchControl setLocation={setLocation} />
            </MapContainer>
          </div>

          <div className={`upload-box ${isDragActive ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-content">
              <FaUpload className="upload-icon" />
              <input 
                type="file" 
                aria-label="Upload image files"
                multiple 
                accept="image/*"
                onChange={handleFileChange} 
                className="upload-input" 
              />
              <p className="upload-text">Drag & drop your images here</p>
              <span className="upload-subtext">or click to browse</span>
              <span className="supported-formats"> (Supports JPG, PNG, WebP formats)</span>
            </div>
          </div>
        </section>

        {images.length > 0 && (
          <>
            <section className="images-section">
              <div className="images-header">
                <h2>Your Images</h2>
              </div>

              <div className="images-grid">
                {images.map((image, index) => (
                  <ImageListItem 
                    key={index}
                    index={index}
                    image={image}
                    fileName={image.name}
                    onFileNameChange={(newName) => handleFileNameChange(index, newName)}
                    onFormatChange={(format) => handleFormatChange(index, format)}
                    loading={loading[index]}
                    setLoading={setLoading}
                    geotagged={geotagged[index]}
                    location={location}
                    onRemove={() => handleClear(index)}
                    selectedFormat={fileFormats[index]}
                    convertedUrl={convertedImages[index]?.url}
                    onDownload={() => handleDownloadWithCredits(index)}
                    showCreditAlert={showCreditAlert}
                    setShowCreditAlert={setShowCreditAlert}
                    setConvertedImages={setConvertedImages}
                    setGeotagged={setGeotagged}
                  />
                ))}
              </div>
            </section>

            <div className="action-buttons-container">
              {images.length > 0 && Object.values(convertedImages).some(img => img?.url) && (
                <button 
                  className="download-all-btn" 
                  onClick={handleDownloadAll}
                >
                  Download All
                </button>
              )}
              <button className="clear-all-btn" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </>
        )}

        <section className="how-to-use-section">
          <h2>How It Works</h2>
          <div className="steps-flow">
            <div className="step-flow">
              <div className="step-number">01</div>
              <FaUpload className="step-icon" />
              <h3>Upload Images</h3>
              <p>Drag & drop your images or click to browse</p>
            </div>

            <div className="step-line">
              <div className="line"></div>
              <div className="arrow">→</div>
            </div>

            <div className="step-flow">
              <div className="step-number">02</div>
              <FaMapMarkerAlt className="step-icon" />
              <h3>Add Location</h3>
              <p>Use the map to set coordinates</p>
            </div>

            <div className="step-line">
              <div className="line"></div>
              <div className="arrow">→</div>
            </div>

            <div className="step-flow">
              <div className="step-number">03</div>
              <FaImage className="step-icon" />
              <h3>Convert & Download</h3>
              <p>Choose format and download</p>
            </div>
          </div>
        </section>

        <section className="features-section">
          <h2>Image Conversion Features</h2>
          <div className="features-row">
            <div className="feature-box">
              <h3>WebP Conversion</h3>
              <p>Convert PNG and JPG to WebP for optimal web performance, or convert WebP to JPG/PNG for better compatibility.</p>
            </div>
            <div className="feature-box">
              <h3>PNG & JPG Support</h3>
              <p>Convert between PNG and JPG formats. Choose PNG for transparency or JPG for smaller file sizes.</p>
            </div>
            <div className="feature-box">
              <h3>EXIF Data Preservation</h3>
              <p>Keep your image metadata intact during conversion. Add or update location data in your EXIF metadata.</p>
            </div>
          </div>
        </section>

        <section className="benefits-section">
          <h2>Conversion Options</h2>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-number">01</div>
              <div className="benefit-content">
                <h3>WebP Optimization</h3>
                <p>Convert your PNG and JPG images to WebP for superior web compression without quality loss.</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-number">02</div>
              <div className="benefit-content">
                <h3>Format Flexibility</h3>
                <p>Convert from WebP to PNG/JPG, PNG to JPG/WebP, or JPG to PNG/WebP based on your needs.</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-number">03</div>
              <div className="benefit-content">
                <h3>Batch Processing</h3>
                <p>Convert multiple images at once while maintaining individual format selections and metadata.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
      {showCreditAlert && (
        <CreditAlert 
          onClose={() => setShowCreditAlert(false)}
          onLogin={signInWithGoogle}
        />
      )}
    </div>
  );
};

export default Home; 