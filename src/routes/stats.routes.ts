import { Router, Response } from 'express';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { Campaign } from '../modules/campaigns/campaign.model';
import { Contribution } from '../modules/contributions/contribution.model';
import { Withdrawal } from '../modules/withdrawals/withdrawal.model';
import { User } from '../modules/users/user.model';

const router = Router();

// Creator Statistics
router.get(
  '/creator',
  authenticateUser,
  authorizeRoles('creator', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const creatorId = req.user!._id;

      // Campaigns stats
      const campaigns = await Campaign.find({ creatorId });
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      
      const totalGoal = campaigns.reduce((acc, c) => acc + c.targetAmount, 0);
      const totalRaised = campaigns.reduce((acc, c) => acc + c.currentAmount, 0);

      // Withdrawals stats
      const withdrawals = await Withdrawal.find({ creatorId });
      const totalWithdrawn = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((acc, w) => acc + w.amount, 0);
      const pendingWithdrawals = withdrawals
        .filter(w => w.status === 'pending')
        .reduce((acc, w) => acc + w.amount, 0);

      // Monthly progress (Recharts format)
      // Group campaigns by category
      const categoriesCount: { [key: string]: number } = {};
      campaigns.forEach(c => {
        categoriesCount[c.category] = (categoriesCount[c.category] || 0) + 1;
      });
      const categoryData = Object.keys(categoriesCount).map(key => ({
        name: key,
        value: categoriesCount[key],
      }));

      res.status(200).json({
        totalCampaigns,
        activeCampaigns,
        totalGoal,
        totalRaised,
        totalWithdrawn,
        pendingWithdrawals,
        categoryData,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Admin Global Statistics
router.get(
  '/admin',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const totalUsers = await User.countDocuments();
      const supportersCount = await User.countDocuments({ role: 'supporter' });
      const creatorsCount = await User.countDocuments({ role: 'creator' });
      const adminsCount = await User.countDocuments({ role: 'admin' });

      const totalCampaigns = await Campaign.countDocuments();
      const pendingCampaigns = await Campaign.countDocuments({ status: 'pending' });
      const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
      const completedCampaigns = await Campaign.countDocuments({ status: 'completed' });

      // Financials
      const contributions = await Contribution.find();
      const totalContributionsAmount = contributions.reduce((acc, c) => acc + c.amount, 0);

      const withdrawals = await Withdrawal.find();
      const totalWithdrawalsApproved = withdrawals
        .filter(w => w.status === 'approved')
        .reduce((acc, w) => acc + w.amount, 0);
      const totalWithdrawalsPending = withdrawals
        .filter(w => w.status === 'pending')
        .reduce((acc, w) => acc + w.amount, 0);

      // Category breakdown
      const campaigns = await Campaign.find();
      const categoriesCount: { [key: string]: number } = {};
      campaigns.forEach(c => {
        categoriesCount[c.category] = (categoriesCount[c.category] || 0) + 1;
      });
      const categoryData = Object.keys(categoriesCount).map(key => ({
        name: key,
        value: categoriesCount[key],
      }));

      res.status(200).json({
        users: { totalUsers, supportersCount, creatorsCount, adminsCount },
        campaigns: { totalCampaigns, pendingCampaigns, activeCampaigns, completedCampaigns },
        financials: {
          totalContributionsAmount,
          totalWithdrawalsApproved,
          totalWithdrawalsPending,
        },
        categoryData,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
