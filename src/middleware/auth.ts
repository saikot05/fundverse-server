import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../modules/users/user.model';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = '';

    // Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // Check cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fundverse_super_secret_jwt_key_9876543210') as {
      id: string;
      email: string;
      role: string;
    };

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'Access denied. User not found.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const authorizeRoles = (...roles: ('supporter' | 'creator' | 'admin')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. User context missing.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
      return;
    }

    next();
  };
};
