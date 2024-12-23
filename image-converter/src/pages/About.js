import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-container">
      <h1>About Web Tagger</h1>
      <section className="about-section">
        <h2>What is Web Tagger?</h2>
        <p>Web Tagger is a powerful tool that allows you to easily add geolocation data to your images. 
           Whether you're organizing your travel photos or managing a collection of location-based images, 
           Web Tagger makes the process simple and efficient.</p>
      </section>

      <section className="about-section">
        <h2>Features</h2>
        <ul>
          <li>Drag and drop image upload</li>
          <li>Interactive map selection</li>
          <li>Batch processing</li>
          <li>WebP conversion for optimized file sizes</li>
          <li>Geolocation tagging</li>
          <li>Bulk download options</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>How to Use</h2>
        <ol>
          <li>Upload your images by dragging them into the upload area</li>
          <li>Select a location on the map</li>
          <li>Click "Add Geotag" to tag your images</li>
          <li>Download your geotagged images individually or as a batch</li>
        </ol>
      </section>
    </div>
  );
};

export default About; 