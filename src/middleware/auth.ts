import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../modules/users/user.model';

export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * authenticateUser middleware
 * Extracts JWT token from the Authorization header or cookies, verifies validity,
 * fetches the corresponding User document from MongoDB, and attaches it to req.user.
 */
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

    // Fallback to BetterAuth session cookie
    const betterAuthCookie = req.cookies?.['better-auth.session_token'] || req.cookies?.['better-auth.session-token'];

    if (!token || token === 'better-auth-session') {
      if (betterAuthCookie) {
        token = betterAuthCookie;
      }
    }

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Try verifying as JWT
    try {
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
      return next();
    } catch (jwtErr) {
      // If JWT verification fails, fallback to verifying BetterAuth session in MongoDB
      const mongoose = require('mongoose');
      const sessionDoc = await mongoose.connection.db?.collection('sessions').findOne({
        sessionToken: token
      });

      if (sessionDoc) {
        // Check session expiration
        if (new Date(sessionDoc.expiresAt) > new Date()) {
          const user = await User.findById(sessionDoc.userId);
          if (user) {
            req.user = user;
            return next();
          }
        }
      }

      res.status(401).json({ message: 'Invalid or expired token.' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

/**
 * authorizeRoles middleware
 * Restricts access to endpoints based on the authenticated user's role.
 * @param roles Array of authorized roles: 'supporter' | 'creator' | 'admin'
 */
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
