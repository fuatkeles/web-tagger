import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../assets/WebTagger.svg';
import { FaMoon, FaSun, FaGoogle, FaUser } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { user, signInWithGoogle, logout } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
            <Link to="/pricing">Pricing</Link>
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
            
            {user ? (
              <div className="user-menu">
                <Link to="/dashboard" className="user-profile">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="profile-pic"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FaUser className="default-user-icon" />
                  )}
                </Link>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn-google" onClick={handleGoogleLogin}>
                <FaGoogle />
                <span>Login with Google</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar; 