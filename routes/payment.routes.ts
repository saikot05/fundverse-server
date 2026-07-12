import { Router, Response } from 'express';
import Stripe from 'stripe';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { Payment } from '../modules/payments/payment.model';
import { User } from '../modules/users/user.model';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();

// Lazy Stripe initialization — avoids reading env before dotenv.config() runs
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured in environment variables.');
    _stripe = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return _stripe;
}

// ─── 1. Create Payment Intent (Supporter) ────────────────────────────────────
router.post(
  '/create-checkout-session',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { amount, credits } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({ message: 'Invalid payment amount.' });
        return;
      }

      const creditsToReward = credits || amount;
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await getStripe().paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          userId: req.user!._id.toString(),
          credits: creditsToReward.toString(),
          amount: amount.toString(),
        },
      });

      // Save pending payment record
      await Payment.create({
        userId: req.user!._id,
        amount,
        creditsPurchased: creditsToReward,
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
      });

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        sessionId: paymentIntent.id, // reuse key name for client compatibility
      });
    } catch (error: any) {
      console.error('Stripe PaymentIntent Error:', error.message);
      res.status(500).json({ message: 'Failed to create payment intent.', error: error.message });
    }
  }
);

// ─── 2. Session Status & Credit Fulfillment ───────────────────────────────────
router.get(
  '/session-status',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        res.status(400).json({ message: 'session_id query param is required.' });
        return;
      }

      const pi = await getStripe().paymentIntents.retrieve(session_id);

      if (pi.status === 'succeeded') {
        // Check if payment was already fulfilled
        const existingPayment = await Payment.findOne({ stripePaymentIntentId: session_id });

        if (existingPayment && existingPayment.status === 'succeeded') {
          const user = await User.findById(req.user!._id);
          res.status(200).json({
            status: 'complete',
            payment_status: 'paid',
            credits: user?.credits ?? req.user!.credits,
            already_processed: true,
          });
          return;
        }

        const creditsToReward = parseFloat(pi.metadata?.credits ?? '0');

        // Mark payment record as succeeded
        if (existingPayment) {
          existingPayment.status = 'succeeded';
          await existingPayment.save();
        } else {
          await Payment.create({
            userId: req.user!._id,
            amount: parseFloat(pi.metadata?.amount ?? '0'),
            creditsPurchased: creditsToReward,
            stripePaymentIntentId: session_id,
            status: 'succeeded',
          });
        }

        // Add credits to user wallet
        const user = await User.findById(req.user!._id);
        if (user) {
          user.credits += creditsToReward;
          await user.save();
        }

        // Notify user
        await Notification.create({
          userId: req.user!._id,
          title: 'Credits Purchased! 🎉',
          message: `${creditsToReward} credits have been added to your wallet.`,
        });

        res.status(200).json({
          status: 'complete',
          payment_status: 'paid',
          credits: user?.credits ?? req.user!.credits,
        });
      } else {
        res.status(200).json({
          status: pi.status === 'canceled' ? 'expired' : 'open',
          payment_status: pi.status,
          credits: req.user!.credits,
        });
      }
    } catch (error: any) {
      console.error('Session Status Error:', error.message);
      res.status(500).json({ message: 'Failed to retrieve session status.', error: error.message });
    }
  }
);

// ─── 3. Payment History ───────────────────────────────────────────────────────
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
