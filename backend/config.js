require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    port: process.env.PORT || 5001,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379
    }
  },
  production: {
    port: process.env.PORT || 5001,
    frontendUrl: 'https://exifquarter.com',
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT)
    }
  }
};

module.exports = config[env]; 