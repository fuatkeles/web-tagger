const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Create a Stripe checkout session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  console.log('[create-checkout-session] Request received.'); // Log start
  try {
    const { priceId, userId } = req.body;
    // Add detailed logging for received data and environment variables
    console.log('[create-checkout-session] Received priceId:', priceId);
    console.log('[create-checkout-session] Received userId:', userId);
    console.log('[create-checkout-session] Env STRIPE_LIFETIME_PRICE_ID:', process.env.STRIPE_LIFETIME_PRICE_ID);
    console.log('[create-checkout-session] Env FRONTEND_URL:', process.env.FRONTEND_URL);

    // Basic validation
    if (!priceId || !userId) {
      console.error('[create-checkout-session] Error: Missing priceId or userId in request body.');
      return res.status(400).json({ error: 'Missing priceId or userId' });
    }

    const lifetimePriceId = process.env.STRIPE_LIFETIME_PRICE_ID;
    const frontendUrl = process.env.FRONTEND_URL;

    // Check if essential env vars are loaded
    if (!lifetimePriceId || !frontendUrl) {
       console.error('[create-checkout-session] Error: Missing STRIPE_LIFETIME_PRICE_ID or FRONTEND_URL in environment variables.');
       return res.status(500).json({ error: 'Server configuration error: Missing environment variables.' });
    }

    const isLifetimePlan = priceId === lifetimePriceId;
    console.log('[create-checkout-session] isLifetimePlan:', isLifetimePlan);

    const successUrl = `${frontendUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/pricing?canceled=true`;
    console.log('[create-checkout-session] Success URL:', successUrl);
    console.log('[create-checkout-session] Cancel URL:', cancelUrl);

    console.log('[create-checkout-session] Attempting to create Stripe session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isLifetimePlan ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        priceId: priceId
      }
    });
    console.log('[create-checkout-session] Stripe session created successfully:', session.id);

    res.json({ sessionId: session.id });
  } catch (error) {
    // Log the specific error from Stripe or other sources
    console.error('[create-checkout-session] Error caught:', error); 
    const errorMessage = error.message || 'Internal server error creating checkout session.';
    res.status(500).json({ error: errorMessage });
  }
});

// Webhook handler - MOVED TO index.js TO BE DEFINED BEFORE GLOBAL express.json()
/*
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Pass the raw request body (Buffer) to constructEvent
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received event:', event.type);

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const priceId = session.metadata.priceId;

    console.log('Processing payment for user:', userId, 'with priceId:', priceId);

    // Get the plan details based on priceId
    let creditsToAdd = 0;
    if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
      creditsToAdd = 150;
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      creditsToAdd = 350;
    } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
      creditsToAdd = 1000;
    } else if (priceId === process.env.STRIPE_LIFETIME_PRICE_ID) {
      creditsToAdd = 10000;
    }

    console.log('Adding credits:', creditsToAdd);

    // Update user's credits in Firebase
    try {
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.error('User document does not exist:', userId);
        return res.status(404).json({ error: 'User not found' });
      }

      await userRef.update({
        credits: admin.firestore.FieldValue.increment(creditsToAdd),
        lastPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionStatus: 'active',
        currentPlan: priceId
      });
      
      console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);
      return res.json({ received: true });
    } catch (error) {
      console.error('Error updating user credits:', error);
      return res.status(500).json({ error: 'Failed to update user credits' });
    }
  }

  // Handle subscription events
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    const priceId = subscription.items.data[0].price.id;

    console.log('Processing subscription payment for user:', userId, 'with priceId:', priceId);

    // Get the plan details based on priceId
    let creditsToAdd = 0;
    if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
      creditsToAdd = 150;
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      creditsToAdd = 350;
    } else if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
      creditsToAdd = 1000;
    }

    if (creditsToAdd > 0) {
      console.log('Adding subscription credits:', creditsToAdd);
      try {
        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          console.error('User document does not exist:', userId);
          return res.status(404).json({ error: 'User not found' });
        }

        await userRef.update({
          credits: admin.firestore.FieldValue.increment(creditsToAdd),
          lastPurchaseDate: admin.firestore.FieldValue.serverTimestamp(),
          subscriptionStatus: 'active',
          currentPlan: priceId
        });
        
        console.log(`Successfully added ${creditsToAdd} subscription credits to user ${userId}`);
        return res.json({ received: true });
      } catch (error) {
        console.error('Error updating subscription credits:', error);
        return res.status(500).json({ error: 'Failed to update subscription credits' });
      }
    }
  }

  res.json({received: true});
});
*/

// Get subscription status
router.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Implement subscription status check logic here
    // You'll need to store the customer ID in your database
    res.json({ status: 'active' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function handleSuccessfulPayment(session) {
  // Implement logic to update user credits/subscription status in your database
  const userId = session.client_reference_id;
  // Update user's subscription status and credits in your database
}

async function handleSubscriptionCanceled(subscription) {
  // Implement logic to handle subscription cancellation
  // Update user's subscription status in your database
}

module.exports = router; 