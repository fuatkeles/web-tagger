import React from 'react';
import { FaImage, FaFileImage, FaImages, FaCamera, FaFileExport, FaFileImport, FaSearchLocation, FaGlobe } from 'react-icons/fa';
import './About.css';

const About = () => {
  return (
    <div className="about-container">
      <div className="about-content">
        <header className="about-header">
          <div className="header-icon">
            <FaImages className="main-icon" />
          </div>
          <h1>About Exif Quarter - Image Converter & EXIF Writer</h1>
          <p className="about-subtitle">
            Convert between popular image formats (PNG to WebP, JPG to PNG, WebP to JPG) while managing EXIF metadata
          </p>
        </header>

        <section className="about-section">
          <div className="section-content">
            <div className="section-icon">
              <FaImage />
            </div>
            <h2>What is Exif Quarter?</h2>
            <p>
              Exif Quarter is an advanced image converter that lets you convert between WebP, PNG, and JPG formats. 
              Whether you need to convert PNG to WebP for better web performance, JPG to PNG for quality, or WebP to JPG for compatibility, 
              our tool handles all conversions while preserving and allowing you to update image EXIF metadata.
            </p>
          </div>
        </section>

        <section className="about-section">
          <div className="section-content">
            <div className="section-icon">
              <FaSearchLocation />
            </div>
            <h2>EXIF Data & SEO Benefits</h2>
            <p>
              Proper EXIF metadata management is crucial for SEO optimization of your images. Search engines like Google use image metadata 
              to better understand your content and improve your search rankings. Here's how EXIF data enhances your SEO:
            </p>
            <ul className="benefits-list">
              <li><FaGlobe className="list-icon" /> Image titles and descriptions in metadata help search engines understand image context</li>
              <li><FaSearchLocation className="list-icon" /> Geolocation data improves local SEO performance</li>
              <li><FaCamera className="list-icon" /> Copyright information protects your content while providing attribution</li>
              <li><FaFileImage className="list-icon" /> Technical details like camera settings help in image categorization</li>
              <li><FaFileExport className="list-icon" /> Alt text stored in metadata improves accessibility and SEO</li>
              <li><FaFileImport className="list-icon" /> Creation date helps search engines show timely content</li>
            </ul>
          </div>
        </section>

        <section className="about-section">
          <div className="section-content">
            <div className="section-icon">
              <FaImages />
            </div>
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
      </div>
    </div>
  );
};

export default About; 