const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestUser() {
  try {
    const testUser = {
      uid: 'test_user_123',
      email: 'test@example.com',
      displayName: 'Test User',
      membershipType: 'pro',
      credits: 100,
      operations: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      apiKey: 'wt_test_123_abc',
      apiRequestsLimit: 100,
      apiRequestsUsed: 0,
      apiPlan: 'pro'
    };

    await db.collection('users').doc(testUser.uid).set(testUser);
    console.log('Test user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser(); 