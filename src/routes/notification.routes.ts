import { Router, Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';
import { Notification } from '../modules/notifications/notification.model';

const router = Router();

// Get active user's notifications
router.get('/', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.status(200).json({ notifications });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Mark all as read
router.patch('/read-all', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany({ userId: req.user!._id, isRead: false }, { isRead: true });
    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

// Mark single as read
router.patch('/:id/read', authenticateUser, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!notification) {
      res.status(404).json({ message: 'Notification not found.' });
      return;
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});

export default router;
