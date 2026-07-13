import { Response, NextFunction, Request } from 'express';
import { User, IUser } from '../modules/users/user.model';
import { jwtVerify, createRemoteJWKSet } from 'jose-cjs';

export interface AuthRequest extends Request {
  user?: IUser;
}

// Lazy remote JWKS initializer
let remoteJWKS: any = null;
function getRemoteJWKS(clientUrl: string) {
  if (!remoteJWKS) {
    remoteJWKS = createRemoteJWKSet(
      new URL(`${clientUrl}/api/auth/jwks`)
    );
  }
  return remoteJWKS;
}


export const authenticateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const clientUrl = process.env.CLIENT_URL;
    if (!clientUrl) {
      res.status(500).json({ message: 'Internal server error: CLIENT_URL configuration missing.' });
      return;
    }

    // 1. Try session validation against remote Next.js Better Auth server
    const sessionRes = await fetch(`${clientUrl}/api/auth/get-session`, {
      headers: {
        cookie: req.headers.cookie || '',
        authorization: req.headers.authorization || '',
      },
    }).catch(() => null);

    if (sessionRes && sessionRes.ok) {
      const session = await sessionRes.json().catch(() => null) as any;
      if (session && session.user) {
        const user = await User.findById(session.user.id);
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    // 2. Fall back to JWT Bearer token remote JWKS validation
    let token = '';
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    try {
      const jwks = getRemoteJWKS(clientUrl);
      const { payload } = await jwtVerify(token, jwks, {
        issuer: clientUrl,
        audience: clientUrl,
      });

      const userId = payload.sub || (payload.user as any)?.id || payload.id;
      
      const user = await User.findById(userId);
      if (!user) {
        res.status(401).json({ message: 'Access denied. User not found.' });
        return;
      }

      req.user = user;
      return next();
    } catch (jwtErr) {
      res.status(401).json({ message: 'Invalid or expired token.' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Authentication error.' });
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
