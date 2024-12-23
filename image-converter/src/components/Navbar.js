import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../assets/WebTagger.svg';
import { FaMoon, FaSun } from 'react-icons/fa';
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
              className="theme-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            <div className="auth-buttons">
              <button className="btn btn-login">Login</button>
              <button className="btn btn-signup">Sign Up</button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar; 