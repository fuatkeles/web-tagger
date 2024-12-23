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
          {location && !geotagged && (
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
                  Add Geotag
                </>
              )}
            </button>
          )}

          {geotagged && convertedUrl && (
            <a 
              href={convertedUrl}
              download={`${name}.${selectedFormat}`}
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
                onChange={handleFileChange} 
                className="upload-input" 
              />
              <p className="upload-text">Drag & drop your images here</p>
              <span className="upload-subtext">or click to browse</span>
            </div>
          </div>
        </section>

        {images.length > 0 && (
          <section className="images-section">
            <div className="images-header">
              <h2>Your Images</h2>
              {allConvertedAndGeotagged && (
                <button className="download-all-btn" onClick={handleDownloadAll}>
                  Download All
                </button>
              )}
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
        )}
      </div>
    </div>
  );
};

export default Home; 