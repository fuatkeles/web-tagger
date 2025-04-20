const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create a Stripe checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      client_reference_id: userId,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for handling Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Add credits to user account based on the subscription
      await handleSuccessfulPayment(session);
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      await handleSubscriptionCanceled(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

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