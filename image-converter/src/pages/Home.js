import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { FaUpload, FaTimes, FaCheckCircle, FaImage, FaMapMarkerAlt } from 'react-icons/fa';
import { ProgressBar } from 'react-loader-spinner';
import LocationMarker from '../components/LocationMarker';
import SearchControl from '../components/SearchControl';
import './Home.css';

const ImageListItem = ({ 
  image, 
  fileName, 
  onFileNameChange, 
  onFormatChange,
  onAddGeotag,
  loading,
  geotagged,
  location,
  onRemove,
  selectedFormat,
  convertedUrl
}) => {
  const [name, setName] = React.useState(fileName.split('.')[0]);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    onFileNameChange(`${newName}.${selectedFormat || 'webp'}`);
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
            onChange={(e) => {
              onFormatChange(e.target.value);
              onFileNameChange(`${name}.${e.target.value}`);
            }}
            value={selectedFormat || 'webp'}
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
              onClick={onAddGeotag}
              disabled={loading}
            >
              {loading ? (
                <div className="loading-container">
                  <ProgressBar
                    height="20"
                    width="20"
                    color="#fff"
                    ariaLabel="loading"
                  />
                  <span>Processing...</span>
                </div>
              ) : (
                <>
                  <FaMapMarkerAlt />
                  {geotagged ? 'Update Geotag' : 'Add Geotag'}
                </>
              )}
            </button>
          )}

          {geotagged && convertedUrl && (
            <a 
              href={convertedUrl}
              download={`${name.replace(/\s+/g, '-')}.${selectedFormat}`}
              className="download-button"
            >
              <FaCheckCircle />
              Download
            </a>
          )}

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
  handleAddGeotag,
  geotagged,
  convertedImages,
  handleClear,
  handleDownloadAll,
  handleClearAll,
  allConvertedAndGeotagged,
  fileFormats,
  handleFormatChange
}) => {
  return (
    <div className="home">
      <div className="container">
        <header className="home-header">
          <h1>Image Converter with EXIF Data Writer</h1>
          <p className="header-description">
            Convert your images between WebP, PNG, and JPG formats while preserving EXIF data. 
            Easily convert PNG to WebP for better web performance, JPG to PNG for quality, or WebP to JPG for wider compatibility. 
            Add precise location data to your image metadata during conversion.
          </p>
        </header>

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
                multiple 
                accept="image/*"
                onChange={handleFileChange} 
                className="upload-input" 
              />
              <p className="upload-text">Drag & drop your images here</p>
              <span className="upload-subtext">or click to browse</span>
              <span className="supported-formats">Supports JPG, PNG, WebP formats</span>
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
                    image={image}
                    fileName={image.name}
                    onFileNameChange={(newName) => handleFileNameChange(index, newName)}
                    onFormatChange={(format) => handleFormatChange(index, format)}
                    onAddGeotag={() => handleAddGeotag(index)}
                    loading={loading[index]}
                    geotagged={geotagged[index]}
                    location={location}
                    onRemove={() => handleClear(index)}
                    selectedFormat={fileFormats[index]}
                    convertedUrl={convertedImages[index]?.url}
                  />
                ))}
              </div>
            </section>

            <div className="action-buttons-container">
              {allConvertedAndGeotagged && (
                <button className="download-all-btn" onClick={handleDownloadAll}>
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

        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-info">
              <p>© 2024 Web Tagger - Image Converter & EXIF Writer</p>
              <p>Convert between WebP, PNG, and JPG formats while preserving and updating image metadata.</p>
            </div>
            <div className="footer-links">
              <a href="/about">About</a>
              <a href="https://github.com/yourusername/web-tagger" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home; 