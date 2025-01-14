const env = process.env.NODE_ENV || 'development';

const config = {
  development: {
    apiUrl: 'http://localhost:5001',
    refreshInterval: 60000, // 1 minute
  },
  production: {
    apiUrl: 'http://localhost:5001',
    refreshInterval: 60000, // 1 minute
  }
};

export default config[env]; 