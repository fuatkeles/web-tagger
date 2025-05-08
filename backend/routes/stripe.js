const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Create a Stripe checkout session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>> [create-checkout-session] HANDLER ENTERED <<<<<<<<<<<<<<<');
  
  // --- Log environment variables AT REQUEST TIME --- 
  console.log('[REQ_TIME] STRIPE_SECRET_KEY available?', !!process.env.STRIPE_SECRET_KEY);
  console.log('[REQ_TIME] STRIPE_LIFETIME_PRICE_ID:', process.env.STRIPE_LIFETIME_PRICE_ID);
  console.log('[REQ_TIME] FRONTEND_URL:', process.env.FRONTEND_URL);
  // --- End Log --- 
  
  try {
    const { priceId, userId } = req.body;
    console.log('[create-checkout-session] Received priceId:', priceId);
    console.log('[create-checkout-session] Received userId:', userId);

    if (!priceId || !userId) {
      console.error('[create-checkout-session] Error: Missing priceId or userId in request body.');
      return res.status(400).json({ error: 'Missing priceId or userId' });
    }

    const lifetimePriceId = process.env.STRIPE_LIFETIME_PRICE_ID;
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!lifetimePriceId || !frontendUrl) {
       console.error('[create-checkout-session] Error: Missing STRIPE_LIFETIME_PRICE_ID or FRONTEND_URL in environment variables at request time.');
       return res.status(500).json({ error: 'Server configuration error: Missing environment variables.' });
    }

    const isLifetimePlan = priceId === lifetimePriceId;
    const successUrl = `${frontendUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/pricing?canceled=true`;
    
    console.log('[create-checkout-session] PREPARING Stripe session with data:', { priceId, userId, isLifetimePlan, successUrl, cancelUrl });

    // --- Re-check secret key just before API call --- 
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[create-checkout-session] FATAL: STRIPE_SECRET_KEY became undefined before API call!');
      return res.status(500).json({ error: 'Server configuration error: Stripe key lost.'});
    }
    // --- End Check ---

    let lineItemsConfig; 
    if (isLifetimePlan) {
      console.log('[create-checkout-session] Lifetime plan detected. Using ONLY price_data for line_items.');
      lineItemsConfig = [{
        price_data: { 
          currency: 'usd',
          product_data: {
            name: 'Life Time',
          },
          unit_amount: 19999, 
        },
        quantity: 1,
      }];
    } else {
      console.log('[create-checkout-session] Subscription plan detected. Using price ID for line_items.');
      lineItemsConfig = [{
        price: priceId,
        quantity: 1,
      }];
    }

    console.log('[create-checkout-session] >>>>> CALLING stripe.checkout.sessions.create with lineItems:', JSON.stringify(lineItemsConfig));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      currency: 'usd',
      line_items: lineItemsConfig,
      mode: isLifetimePlan ? 'payment' : 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        priceId: priceId
      }
    });
    
    console.log('[create-checkout-session] <<<<< RETURNED from stripe.checkout.sessions.create.');
    console.log('[create-checkout-session] Session ID:', session.id);
    console.log('[create-checkout-session] Session URL:', session.url);

    // Return ALL relevant session data for maximum compatibility
    const responseData = { 
      sessionId: session.id,
      url: session.url,
      sessionData: {
        id: session.id,
        object: session.object,
        mode: session.mode
      }
    };
    
    console.log('[create-checkout-session] Sending response:', JSON.stringify(responseData));
    res.json(responseData);

  } catch (error) {
    console.error('[create-checkout-session] >>>>> CAUGHT ERROR <<<<<');
    console.error('[create-checkout-session] Error details:', error); // Log the full error object
    const errorMessage = error.message || 'Internal server error creating checkout session.';
    // Add more specific error checking if needed
    if (error.type === 'StripeInvalidRequestError') {
        console.error('[create-checkout-session] StripeInvalidRequestError - Check parameters like priceId.');
    }
    res.status(500).json({ error: errorMessage, type: error.type }); // Send error type back to frontend if possible
  }
  console.log('>>>>>>>>>>>>>>>>> [create-checkout-session] HANDLER EXITING <<<<<<<<<<<<<<<');
});

// Create a Pay As You Go Stripe checkout session
router.post('/create-payg-checkout-session', express.json(), async (req, res) => {
  console.log('>>>>>>>>>>>>>>>>> [create-payg-checkout-session] HANDLER ENTERED <<<<<<<<<<<<<<<');
  try {
    const { creditsToPurchase, amountInCents, userId } = req.body;
    console.log('[create-payg-checkout-session] Received data:', { creditsToPurchase, amountInCents, userId });

    if (!userId || !creditsToPurchase || amountInCents === undefined || amountInCents <= 0) {
      console.error('[create-payg-checkout-session] Error: Missing or invalid parameters.');
      return res.status(400).json({ error: 'Missing or invalid parameters for Pay As You Go session' });
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl) {
       console.error('[create-payg-checkout-session] Error: Missing FRONTEND_URL in environment variables.');
       return res.status(500).json({ error: 'Server configuration error: Missing FRONTEND_URL.' });
    }

    const successUrl = `${frontendUrl}/dashboard?payg_success=true&credits_added=${creditsToPurchase}`;
    const cancelUrl = `${frontendUrl}/pricing?payg_canceled=true`;

    console.log('[create-payg-checkout-session] >>>>> CALLING stripe.checkout.sessions.create for PAYG...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Pay As You Go Credits',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: userId,
        creditsPurchased: creditsToPurchase.toString(), // Stripe metadata values must be strings
        paymentType: 'payAsYouGo',
      },
    });

    console.log('[create-payg-checkout-session] <<<<< RETURNED from stripe.checkout.sessions.create for PAYG.');
    res.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('[create-payg-checkout-session] >>>>> CAUGHT ERROR <<<<<', error);
    res.status(500).json({ error: error.message || 'Internal server error creating PAYG checkout session' });
  }
  console.log('>>>>>>>>>>>>>>>>> [create-payg-checkout-session] HANDLER EXITING <<<<<<<<<<<<<<<');
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