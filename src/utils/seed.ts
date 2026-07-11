import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '../fundverse-client/.env.local') });

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fundverse';
    await mongoose.connect(mongoUri);
    console.log('Seeding database...');

    // Clear existing admin user
    await User.deleteMany({ email: 'admin@fundverse.io' });

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      name: 'System Admin',
      email: 'admin@fundverse.io',
      password: hashedPassword,
      role: 'admin',
      credits: 9999,
      image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
    });

    console.log('Seed successful! Default Admin account created.');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seed();
