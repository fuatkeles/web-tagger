const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001',
    refreshInterval: 60000, // 1 minute
  },
  production: {
    apiUrl: 'https://exifquarter.com',
    refreshInterval: 60000, // 1 minute
  }
};

export default config[env]; 