import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-info">
          <p>© 2024 Exif Quarter - Image Converter & EXIF Writer</p>
          <p>Convert between WebP, PNG, and JPG formats while preserving and updating image metadata.</p>
        </div>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/pricing">Pricing</a>
          <a href="https://www.linkedin.com/company/exif-quarter/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 