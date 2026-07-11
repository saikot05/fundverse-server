import { betterAuth } from 'better-auth';

// BetterAuth configuration for multi-role user management
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || 'better_auth_secret_key_1234567890123456',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  database: {
    // Custom adapter or basic configuration
    // BetterAuth supports credential providers and third party social oauth providers
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
    },
  },
});
