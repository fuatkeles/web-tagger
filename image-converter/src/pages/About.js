import React from 'react';
import { FaMapMarkerAlt, FaImage, FaDownload, FaCloudUploadAlt } from 'react-icons/fa';
import './About.css';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-content">
        <header className="about-header">
          <h1>About Web Tagger - Image Converter & EXIF Writer</h1>
          <p className="about-subtitle">
            Convert between popular image formats (PNG to WebP, JPG to PNG, WebP to JPG) while managing EXIF metadata
          </p>
        </header>

        <section className="about-section">
          <div className="section-content">
            <h2>What is Web Tagger?</h2>
            <p>
              Web Tagger is an advanced image converter that lets you convert between WebP, PNG, and JPG formats. 
              Whether you need to convert PNG to WebP for better web performance, JPG to PNG for quality, or WebP to JPG for compatibility, 
              our tool handles all conversions while preserving and allowing you to update image EXIF metadata.
            </p>
          </div>
        </section>

        <section className="about-section features-grid">
          <div className="feature-card">
            <FaCloudUploadAlt className="feature-icon" />
            <h3>WebP Conversion</h3>
            <p>Convert PNG and JPG to WebP for optimal web performance. Also supports converting WebP back to PNG or JPG when needed.</p>
          </div>

          <div className="feature-card">
            <FaMapMarkerAlt className="feature-icon" />
            <h3>PNG & JPG Support</h3>
            <p>Convert between PNG and JPG formats. Choose PNG for transparency or JPG for smaller file sizes.</p>
          </div>

          <div className="feature-card">
            <FaImage className="feature-icon" />
            <h3>EXIF Handling</h3>
            <p>Preserve EXIF metadata during conversion. Add or update location data in your image metadata.</p>
          </div>

          <div className="feature-card">
            <FaDownload className="feature-icon" />
            <h3>Batch Converting</h3>
            <p>Convert multiple images at once. Perfect for processing entire photo collections.</p>
          </div>
        </section>

        <section className="about-section">
          <div className="section-content">
            <h2>Supported Conversions</h2>
            <div className="steps-container">
              <div className="step">
                <span className="step-number">01</span>
                <h3>PNG Conversions</h3>
                <p>Convert PNG to WebP for better web performance, or PNG to JPG for smaller file sizes.</p>
              </div>

              <div className="step">
                <span className="step-number">02</span>
                <h3>JPG Conversions</h3>
                <p>Convert JPG to PNG for better quality, or JPG to WebP for optimal web images.</p>
              </div>

              <div className="step">
                <span className="step-number">03</span>
                <h3>WebP Conversions</h3>
                <p>Convert WebP to PNG for editing, or WebP to JPG for wider compatibility.</p>
              </div>

              <div className="step">
                <span className="step-number">04</span>
                <h3>Metadata Handling</h3>
                <p>Preserve and update EXIF data during any conversion process.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="section-content">
            <h2>Technical Features</h2>
            <ul className="benefits-list">
              <li>Convert PNG to WebP for optimal web images</li>
              <li>Convert JPG to PNG for better image quality</li>
              <li>Convert WebP to JPG for wider compatibility</li>
              <li>Convert PNG to JPG for smaller file sizes</li>
              <li>Convert JPG to WebP for web optimization</li>
              <li>Convert WebP to PNG for image editing</li>
              <li>Preserve EXIF metadata during conversion</li>
              <li>Add location data to image metadata</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About; 