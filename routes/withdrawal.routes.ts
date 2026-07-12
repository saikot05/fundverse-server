import { Router, Response } from 'express';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { Withdrawal } from '../modules/withdrawals/withdrawal.model';
import { Campaign } from '../modules/campaigns/campaign.model';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();

// Request Withdrawal (Creator)
router.post(
  '/',
  authenticateUser,
  authorizeRoles('creator', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { campaignId, amount, bankDetails } = req.body;

      if (!campaignId || !amount || !bankDetails) {
        res.status(400).json({ message: 'Campaign ID, amount and bank details are required.' });
        return;
      }

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found.' });
        return;
      }

      // Check ownership
      if (campaign.creatorId.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
        res.status(403).json({ message: 'Not authorized to request withdrawal for this campaign.' });
        return;
      }

      // Compute available withdrawable amount
      const existingWithdrawals = await Withdrawal.find({
        campaignId,
        status: { $ne: 'rejected' }, // Approved and Pending deductions
      });

      const totalDeducted = existingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      const available = campaign.currentAmount - totalDeducted;

      if (amount > available) {
        res.status(400).json({
          message: `Insufficient withdrawable funds. Campaign has ${available} credits remaining for withdrawal (current: ${campaign.currentAmount}, locked/withdrawn: ${totalDeducted}).`,
        });
        return;
      }

      const withdrawal = await Withdrawal.create({
        creatorId: req.user!._id,
        campaignId,
        amount,
        status: 'pending',
        bankDetails,
      });

      // Notify Creator
      await Notification.create({
        userId: req.user!._id,
        title: 'Withdrawal Requested',
        message: `Your request to withdraw ${amount} credits from "${campaign.title}" has been submitted for approval.`,
      });

      res.status(201).json({ message: 'Withdrawal requested successfully.', withdrawal });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get Creator's Withdrawals (Creator)
router.get(
  '/my-withdrawals',
  authenticateUser,
  authorizeRoles('creator', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const withdrawals = await Withdrawal.find({ creatorId: req.user!._id })
        .populate('campaignId', 'title category image')
        .sort({ createdAt: -1 });
      res.status(200).json({ withdrawals });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Get All Withdrawals (Admin)
router.get(
  '/admin/all',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const withdrawals = await Withdrawal.find()
        .populate('creatorId', 'name email')
        .populate('campaignId', 'title targetAmount currentAmount')
        .sort({ createdAt: -1 });
      res.status(200).json({ withdrawals });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Approve Withdrawal (Admin)
router.patch(
  '/:id/approve',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const withdrawal = await Withdrawal.findById(req.params.id);
      if (!withdrawal) {
        res.status(404).json({ message: 'Withdrawal request not found.' });
        return;
      }

      if (withdrawal.status !== 'pending') {
        res.status(400).json({ message: `Withdrawal request is already ${withdrawal.status}.` });
        return;
      }

      withdrawal.status = 'approved';
      await withdrawal.save();

      // Notify Creator
      await Notification.create({
        userId: withdrawal.creatorId,
        title: 'Withdrawal Approved',
        message: `Your withdrawal request of ${withdrawal.amount} credits has been approved and processed.`,
      });

      res.status(200).json({ message: 'Withdrawal approved successfully.', withdrawal });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Reject Withdrawal (Admin)
router.patch(
  '/:id/reject',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const withdrawal = await Withdrawal.findById(req.params.id);
      if (!withdrawal) {
        res.status(404).json({ message: 'Withdrawal request not found.' });
        return;
      }

      if (withdrawal.status !== 'pending') {
        res.status(400).json({ message: `Withdrawal request is already ${withdrawal.status}.` });
        return;
      }

      withdrawal.status = 'rejected';
      await withdrawal.save();

      // Notify Creator
      await Notification.create({
        userId: withdrawal.creatorId,
        title: 'Withdrawal Rejected',
        message: `Your withdrawal request of ${withdrawal.amount} credits has been rejected.`,
      });

      res.status(200).json({ message: 'Withdrawal rejected successfully.', withdrawal });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
