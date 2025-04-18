const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/apiAuth');

// Test implementation of image analysis
async function analyzeImage(url) {
  // This is a mock implementation for testing
  return [
    {
      name: "test_tag",
      confidence: 0.95
    },
    {
      name: "sample",
      confidence: 0.85
    }
  ];
}

// Test implementation of metadata update
async function updateMetadata(url, metadata) {
  // This is a mock implementation for testing
  return true;
}

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// Add rate limit headers to all responses
router.use((req, res, next) => {
  res.set({
    'X-RateLimit-Limit': req.user.requestsLimit,
    'X-RateLimit-Remaining': req.user.requestsLimit - req.user.requestsUsed,
    'X-RateLimit-Reset': getNextResetTime()
  });
  next();
});

// Get tags for an image URL
router.get('/tags', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const tags = await analyzeImage(url);
    res.json({ tags });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update image metadata
router.post('/metadata', async (req, res) => {
  try {
    const { url, metadata } = req.body;
    
    if (!url || !metadata) {
      return res.status(400).json({ error: 'URL and metadata are required' });
    }

    await updateMetadata(url, metadata);
    res.json({ success: true, message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get next reset time (start of next month)
function getNextResetTime() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
}

module.exports = router; 