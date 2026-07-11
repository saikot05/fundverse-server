import { Router, Response } from 'express';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { Report } from '../modules/reports/report.model';
import { Campaign } from '../modules/campaigns/campaign.model';

const router = Router();

// Submit a Report (Authenticated)
router.post('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, reason } = req.body;

    if (!campaignId || !reason) {
      res.status(400).json({ message: 'Campaign ID and reason are required.' });
      return;
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found.' });
      return;
    }

    const report = await Report.create({
      reporterId: req.user!._id,
      campaignId,
      reason,
      status: 'pending',
    });

    res.status(201).json({ message: 'Report submitted successfully. Admins will review it.', report });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Get All Reports (Admin)
router.get(
  '/admin/all',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const reports = await Report.find()
        .populate('reporterId', 'name email')
        .populate('campaignId', 'title status creatorId')
        .sort({ createdAt: -1 });
      res.status(200).json({ reports });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Resolve Report (Admin)
router.patch(
  '/:id/resolve',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const report = await Report.findById(req.params.id);
      if (!report) {
        res.status(404).json({ message: 'Report not found.' });
        return;
      }

      report.status = 'resolved';
      await report.save();

      res.status(200).json({ message: 'Report resolved successfully.', report });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
