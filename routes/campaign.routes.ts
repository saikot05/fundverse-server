import { Router, Response } from 'express';
import { Campaign } from '../modules/campaigns/campaign.model';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();

// Create Campaign (Creator)
router.post(
  '/',
  authenticateUser,
  authorizeRoles('creator', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, description, shortDescription, category, targetAmount, image, deadline } = req.body;

      if (!title || !description || !shortDescription || !category || !targetAmount || !image || !deadline) {
        res.status(400).json({ message: 'All campaign fields are required.' });
        return;
      }

      const campaign = await Campaign.create({
        title,
        description,
        shortDescription,
        category,
        targetAmount,
        currentAmount: 0,
        image,
        creatorId: req.user!._id,
        status: 'pending',
        deadline: new Date(deadline),
      });

      // Create admin notification
      await Notification.create({
        userId: req.user!._id, // notify the creator
        title: 'Campaign Submitted',
        message: `Your campaign "${title}" has been submitted for review.`,
      });

      res.status(201).json({ message: 'Campaign created and pending approval.', campaign });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get Creator's Campaigns (Creator)
router.get(
  '/my-campaigns',
  authenticateUser,
  authorizeRoles('creator', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaigns = await Campaign.find({ creatorId: req.user!._id }).sort({ createdAt: -1 });
      res.status(200).json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get All Campaigns (Public with filters, sorting, searching, pagination)
router.get('/', async (req: any, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};

    // Search query
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search as string, $options: 'i' } },
        { shortDescription: { $regex: req.query.search as string, $options: 'i' } },
      ];
    }

    // Category filter
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Goal Range filter
    if (req.query.goalRange) {
      if (req.query.goalRange === 'under5k') {
        query.targetAmount = { $lt: 5000 };
      } else if (req.query.goalRange === '5kt10k') {
        query.targetAmount = { $gte: 5000, $lte: 10000 };
      } else if (req.query.goalRange === 'over10k') {
        query.targetAmount = { $gt: 10000 };
      }
    }

    // Status filter
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      // By default, public should only see active or completed campaigns unless admin or creator requests specific filters
      query.status = 'active';
    }

    // Sorting
    let sort: any = { createdAt: -1 };
    if (req.query.sort) {
      if (req.query.sort === 'targetAmountAsc') sort = { targetAmount: 1 };
      else if (req.query.sort === 'targetAmountDesc') sort = { targetAmount: -1 };
      else if (req.query.sort === 'progressAsc') sort = { currentAmount: 1 };
      else if (req.query.sort === 'progressDesc') sort = { currentAmount: -1 };
      else if (req.query.sort === 'deadline') sort = { deadline: 1 };
    }

    const campaigns = await Campaign.find(query)
      .populate('creatorId', 'name email image')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Campaign.countDocuments(query);

    res.status(200).json({
      campaigns,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Admin view all campaigns (including pending, active, rejected)
router.get(
  '/admin/all',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaigns = await Campaign.find()
        .populate('creatorId', 'name email')
        .sort({ createdAt: -1 });
      res.status(200).json({ campaigns });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get Single Campaign (Public)
router.get('/:id', async (req: any, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('creatorId', 'name email image');
    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found.' });
      return;
    }
    res.status(200).json({ campaign });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Update Campaign (Creator/Admin)
router.patch(
  '/:id',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      // Check ownership or if user is admin
      if (campaign.creatorId.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
        res.status(403).json({ message: 'Not authorized to update this campaign.' });
        return;
      }

      const updates = req.body;
      // Protect sensitive fields if user is not admin
      if (req.user!.role !== 'admin') {
        delete updates.status;
        delete updates.currentAmount;
        delete updates.creatorId;
      }

      const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, updates, { new: true });
      res.status(200).json({ message: 'Campaign updated successfully.', campaign: updatedCampaign });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Delete Campaign (Creator/Admin)
router.delete(
  '/:id',
  authenticateUser,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      if (campaign.creatorId.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
        res.status(403).json({ message: 'Not authorized to delete this campaign.' });
        return;
      }

      await Campaign.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: 'Campaign deleted successfully.' });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Approve Campaign (Admin)
router.patch(
  '/:id/approve',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      campaign.status = 'active';
      await campaign.save();

      // Notify Creator
      await Notification.create({
        userId: campaign.creatorId,
        title: 'Campaign Approved',
        message: `Your campaign "${campaign.title}" has been approved and is now active!`,
      });

      res.status(200).json({ message: 'Campaign approved successfully.', campaign });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Reject Campaign (Admin)
router.patch(
  '/:id/reject',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const campaign = await Campaign.findById(req.params.id);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      campaign.status = 'rejected';
      await campaign.save();

      // Notify Creator
      await Notification.create({
        userId: campaign.creatorId,
        title: 'Campaign Rejected',
        message: `Your campaign "${campaign.title}" has been rejected.`,
      });

      res.status(200).json({ message: 'Campaign rejected.', campaign });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
