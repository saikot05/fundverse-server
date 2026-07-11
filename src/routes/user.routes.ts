import { Router, Response } from 'express';
import { authenticateUser, authorizeRoles, AuthRequest } from '../middleware/auth';
import { User } from '../modules/users/user.model';
import { USER_ROLES } from '../config/constants';

const router = Router();

// Get All Users (Admin only)
router.get(
  '/admin/users',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      res.status(200).json({ users });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

// Update User Role (Admin only)
router.patch(
  '/admin/users/:id/role',
  authenticateUser,
  authorizeRoles('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { role } = req.body;

      if (!role || !(USER_ROLES as readonly string[]).includes(role)) {
        res.status(400).json({ message: `Invalid role. Must be one of: ${USER_ROLES.join(', ')}` });
        return;
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      user.role = role;
      await user.save();

      res.status(200).json({
        message: 'User role updated successfully.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  }
);

export default router;
