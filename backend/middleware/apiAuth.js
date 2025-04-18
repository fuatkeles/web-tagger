const { getFirestore } = require('firebase-admin/firestore');

const TEST_MODE = process.env.NODE_ENV === 'test';
const TEST_USER = {
  uid: 'test_user_123',
  apiPlan: 'pro',
  apiRequestsLimit: 100,
  apiRequestsUsed: 0
};

const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  try {
    // Use test user in test mode
    if (TEST_MODE && apiKey === 'test_key') {
      req.user = TEST_USER;
      return next();
    }

    const db = getFirestore();
    
    // Query user by API key
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('apiKey', '==', apiKey).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const user = snapshot.docs[0].data();
    const userRef = snapshot.docs[0].ref;

    // Check if user has exceeded their request limit
    if (user.apiRequestsUsed >= user.apiRequestsLimit) {
      return res.status(429).json({ 
        error: 'API request limit exceeded',
        limit: user.apiRequestsLimit,
        used: user.apiRequestsUsed,
        plan: user.apiPlan
      });
    }

    // Increment request count
    await userRef.update({
      apiRequestsUsed: user.apiRequestsUsed + 1,
      lastUpdated: new Date().toISOString()
    });

    // Add user info to request for later use
    req.user = {
      uid: user.uid,
      apiPlan: user.apiPlan,
      requestsUsed: user.apiRequestsUsed + 1,
      requestsLimit: user.apiRequestsLimit
    };

    next();
  } catch (error) {
    console.error('API auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = apiKeyAuth; 