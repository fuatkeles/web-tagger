import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../assets/WebTagger.svg';
import { FaMoon, FaSun, FaGoogle } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const { isDarkMode, setIsDarkMode } = useTheme();

  return (
    <header className="header">
      <nav className="nav-container">
        <div className="nav-content">
          <div className="nav-left">
            <Link to="/" className="logo">
              <Logo />
            </Link>
          </div>
          
          <div className="nav-right">
            <Link to="/about">About</Link>
            <button 
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle dark mode"
            >
              <div className="theme-toggle-track">
                <div className="theme-toggle-thumb">
                  {isDarkMode ? <FaMoon /> : <FaSun />}
                </div>
              </div>
            </button>
            <button className="btn-google">
              <FaGoogle />
              <span>Login with Google</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar; 