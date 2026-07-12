import { Router, Response } from 'express';
import Stripe from 'stripe';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { Payment } from '../modules/payments/payment.model';
import { User } from '../modules/users/user.model';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_51Pabcdefghijklmnopqrstuvwxyz123456789';
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-12-18.accredited' as any,
});

// Create Stripe Payment Intent (Supporter)
router.post(
  '/create-payment-intent',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount } = req.body; // Amount in USD cents/dollars. Let's assume amount in Dollars (e.g. 10 = $10)

      if (!amount || amount <= 0) {
        res.status(400).json({ message: 'Invalid payment amount.' });
        return;
      }

      // Convert to cents for Stripe
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          userId: req.user!._id.toString(),
          credits: amount.toString(),
        },
      });

      // Save pending payment record
      await Payment.create({
        userId: req.user!._id,
        amount,
        creditsPurchased: amount, // 1 dollar = 1 credit ratio
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('Stripe Error:', error.message);
      res.status(500).json({ message: 'Failed to create payment intent.', error: error.message });
    }
  }
);

// Verify Stripe Payment & Add Credits (Supporter)
router.post(
  '/verify',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ message: 'Payment Intent ID is required.' });
        return;
      }

      // Retrieve from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        res.status(400).json({ message: `Payment failed. Current status: ${paymentIntent.status}` });
        return;
      }

      // Check if payment was already processed
      const existingPayment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
      
      if (existingPayment && existingPayment.status === 'succeeded') {
        res.status(200).json({
          message: 'Payment already verified.',
          credits: req.user!.credits,
        });
        return;
      }

      const creditsToReward = parseFloat(paymentIntent.metadata.credits) || 0;

      if (existingPayment) {
        existingPayment.status = 'succeeded';
        await existingPayment.save();
      } else {
        // Fallback create if not exists
        await Payment.create({
          userId: req.user!._id,
          amount: creditsToReward,
          creditsPurchased: creditsToReward,
          stripePaymentIntentId: paymentIntentId,
          status: 'succeeded',
        });
      }

      // Add credits to user wallet
      const user = await User.findById(req.user!._id);
      if (user) {
        user.credits += creditsToReward;
        await user.save();
      }

      // Create notification
      await Notification.create({
        userId: req.user!._id,
        title: 'Credits Purchased',
        message: `Successfully purchased and added ${creditsToReward} credits to your account.`,
      });

      res.status(200).json({
        message: 'Payment verified and credits added successfully.',
        credits: user ? user.credits : req.user!.credits,
      });
    } catch (error: any) {
      console.error('Verify Error:', error.message);
      res.status(500).json({ message: 'Failed to verify payment.', error: error.message });
    }
  }
);

// Get User's Payments History (Supporter / Admin)
router.get(
  '/history',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const payments = await Payment.find({ userId: req.user!._id }).sort({ createdAt: -1 });
      res.status(200).json({ payments });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
