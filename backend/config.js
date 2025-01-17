require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    port: process.env.PORT || 5001,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },
  production: {
    port: process.env.PORT || 5001,
    frontendUrl: [
      'https://exifquarter.com',
      'https://www.exifquarter.com'
    ]
  }
};

module.exports = config[env]; 