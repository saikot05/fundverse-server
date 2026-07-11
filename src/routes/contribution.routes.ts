import { Router, Response } from 'express';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { Contribution } from '../modules/contributions/contribution.model';
import { Campaign } from '../modules/campaigns/campaign.model';
import { User } from '../modules/users/user.model';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();

// Make a Contribution (Supporter)
router.post(
  '/',
  authenticateUser,
  authorizeRoles('supporter', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId, amount } = req.body;

      if (!campaignId || !amount || amount <= 0) {
        res.status(400).json({ message: 'Campaign ID and positive amount are required.' });
        return;
      }

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      if (campaign.status !== 'active') {
        res.status(400).json({ message: 'Contributions are only allowed on active campaigns.' });
        return;
      }

      if (new Date() > new Date(campaign.deadline)) {
        res.status(400).json({ message: 'Campaign deadline has passed.' });
        return;
      }

      const supporter = await User.findById(req.user!._id);
      if (!supporter) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      if (supporter.credits < amount) {
        res.status(400).json({ message: 'Insufficient credits. Please purchase more credits.' });
        return;
      }

      // Deduct credits from supporter and add to campaign
      supporter.credits -= amount;
      await supporter.save();

      campaign.currentAmount += amount;
      await campaign.save();

      // Create contribution record
      const contribution = await Contribution.create({
        campaignId,
        supporterId: supporter._id,
        amount,
      });

      // Get creator details for notification
      const creator = await User.findById(campaign.creatorId);

      // Notify Creator
      if (creator) {
        await Notification.create({
          userId: creator._id,
          title: 'New Contribution Received',
          message: `Supporter "${supporter.name}" contributed ${amount} credits to your campaign "${campaign.title}".`,
        });
      }

      // Notify Supporter
      await Notification.create({
        userId: supporter._id,
        title: 'Contribution Successful',
        message: `You successfully contributed ${amount} credits to "${campaign.title}".`,
      });

      // Check if goal reached
      if (campaign.currentAmount >= campaign.targetAmount) {
        if (creator) {
          await Notification.create({
            userId: creator._id,
            title: 'Campaign Goal Reached!',
            message: `Congratulations! Your campaign "${campaign.title}" has reached or exceeded its target of ${campaign.targetAmount} credits!`,
          });
        }
      }

      res.status(201).json({
        message: 'Contribution made successfully.',
        contribution,
        remainingCredits: supporter.credits,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get Contributions for a specific campaign (Public)
router.get('/campaign/:campaignId', async (req: any, res: Response): Promise<void> => {
  try {
    const contributions = await Contribution.find({ campaignId: req.params.campaignId })
      .populate('supporterId', 'name image')
      .sort({ createdAt: -1 });
    res.status(200).json({ contributions });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get User's Contributions (Supporter)
router.get(
  '/my-contributions',
  authenticateUser,
  authorizeRoles('supporter', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const contributions = await Contribution.find({ supporterId: req.user!._id })
        .populate('campaignId', 'title image status category shortDescription')
        .sort({ createdAt: -1 });
      res.status(200).json({ contributions });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
