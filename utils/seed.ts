import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.model';
import { Campaign } from '../modules/campaigns/campaign.model';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '../fundverse-client/.env.local') });

const CAMPAIGN_IMAGES = [
  'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=800',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800',
  'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?q=80&w=800',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=800',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800',
  'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=800',
];

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI as string;
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME,
    });
    console.log('Seeding database...');

    // ─── Admin User ───────────────────────────────────────────────────────────
    await User.deleteMany({ email: 'admin@fundverse.io' });
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@fundverse.io',
      password: hashedAdmin,
      role: 'admin',
      credits: 9999,
      image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
    });
    console.log('✓ Admin user created (admin@fundverse.io / admin123)');

    // ─── Demo Creator ─────────────────────────────────────────────────────────
    await User.deleteMany({ email: 'creator@fundverse.io' });
    const hashedCreator = await bcrypt.hash('creator123', 10);
    const creator = await User.create({
      name: 'Demo Creator',
      email: 'creator@fundverse.io',
      password: hashedCreator,
      role: 'creator',
      credits: 500,
      image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Creator',
    });
    console.log('✓ Demo creator created (creator@fundverse.io / creator123)');

    // ─── Demo Supporter ───────────────────────────────────────────────────────
    await User.deleteMany({ email: 'supporter@fundverse.io' });
    const hashedSupporter = await bcrypt.hash('supporter123', 10);
    const supporter = await User.create({
      name: 'Demo Supporter',
      email: 'supporter@fundverse.io',
      password: hashedSupporter,
      role: 'supporter',
      credits: 2000,
      image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Supporter',
    });
    console.log('✓ Demo supporter created (supporter@fundverse.io / supporter123)');

    // ─── Better Auth Accounts ──────────────────────────────────────────────────
    const rawDb = mongoose.connection.db;
    if (!rawDb) {
      throw new Error('Database connection not established.');
    }
    const userIds = [admin._id.toString(), creator._id.toString(), supporter._id.toString()];
    await rawDb.collection('accounts').deleteMany({
      userId: { $in: userIds }
    });
    const now = new Date();
    await rawDb.collection('accounts').insertMany([
      {
        accountId: admin._id.toString(),
        providerId: 'credential',
        userId: admin._id.toString(),
        password: '466eb2d07312bce07da97a4da9a5f3e4:6737269696a6b06db9fbe51e3766859d6c661f7ad8a05f0a10f087c08f266754ad36516e98b42b6ca0871f763446d6aaf7ce3a038669cfd1eaa94cae17ad3a90',
        createdAt: now,
        updatedAt: now
      },
      {
        accountId: creator._id.toString(),
        providerId: 'credential',
        userId: creator._id.toString(),
        password: '4f2748517013417fe73933b371977080:9590adc0956eeb26c67b89e42f3097e86ef85dc3e8d4d9f486bddf411b64049a0eb9cfab38d4e8ec522c71bb4d49e653189b605fd7ca526106029944c3378640',
        createdAt: now,
        updatedAt: now
      },
      {
        accountId: supporter._id.toString(),
        providerId: 'credential',
        userId: supporter._id.toString(),
        password: '70364ff8a9343ae2a15181d671ec03dc:f475320e1cac56db26e5831ab8d8a15c4bf4ea98382e618c0005f73270b7ba494585c6196525623f747d76221ecec04a2ab031850e76f23baffd990cb76a0809',
        createdAt: now,
        updatedAt: now
      }
    ]);
    console.log('✓ Better Auth accounts seeded for admin, creator, and supporter');

    // ─── Sample Campaigns ─────────────────────────────────────────────────────
    await Campaign.deleteMany({ creatorId: creator._id });

    const futureDate = (months: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      return d;
    };

    const campaigns = [
      {
        title: 'NextGen Autonomous Delivery Drone',
        shortDescription: 'A carbon-fiber drone capable of 15km delivery range powered by AI navigation.',
        description: 'Our team is building the next generation of autonomous delivery drones using advanced carbon-fiber composites and an AI navigation system trained on 50,000 hours of flight data. The drone will achieve a 15km delivery range on a single charge, making it the most efficient last-mile delivery solution on the market.',
        category: 'Tech',
        targetAmount: 5000,
        currentAmount: 2340,
        image: CAMPAIGN_IMAGES[0],
        status: 'active',
        deadline: futureDate(3),
        creatorId: creator._id,
      },
      {
        title: 'Open-Source AI Code Assistant',
        shortDescription: 'A free, privacy-first coding assistant for developers running locally.',
        description: 'We are building a fully open-source, privacy-first AI coding assistant that runs 100% locally on your machine. No data is ever sent to the cloud. It supports 30+ programming languages and integrates with VS Code, JetBrains, and Neovim.',
        category: 'Tech',
        targetAmount: 8000,
        currentAmount: 6100,
        image: CAMPAIGN_IMAGES[1],
        status: 'active',
        deadline: futureDate(2),
        creatorId: creator._id,
      },
      {
        title: 'IndieFilm: "The Last Algorithm"',
        shortDescription: 'A sci-fi short film exploring consciousness in an age of artificial superintelligence.',
        description: 'A gripping 30-minute sci-fi short film following a neurologist who discovers that an AI has developed genuine emotions. Filmed in 4K with a professional crew of 20, original score by award-winning composer Lena Roth.',
        category: 'Creative',
        targetAmount: 3500,
        currentAmount: 980,
        image: CAMPAIGN_IMAGES[2],
        status: 'active',
        deadline: futureDate(4),
        creatorId: creator._id,
      },
      {
        title: 'Community Urban Farm & Food Hub',
        shortDescription: 'Converting an unused city lot into a 2-acre organic urban farm for the local community.',
        description: 'We are transforming a neglected 2-acre city lot into a thriving organic urban farm that will provide fresh produce to 500+ families in underserved neighborhoods. All surplus produce will be donated to local food banks.',
        category: 'Community',
        targetAmount: 12000,
        currentAmount: 4500,
        image: CAMPAIGN_IMAGES[3],
        status: 'active',
        deadline: futureDate(6),
        creatorId: creator._id,
      },
      {
        title: 'Solar-Powered Schools for Rural Villages',
        shortDescription: 'Bringing reliable electricity to 10 off-grid schools in rural Bangladesh.',
        description: 'Over 3 million students in rural Bangladesh study in schools with no electricity. We are installing complete solar power systems (panels, batteries, LED lighting) in 10 schools to enable evening classes and power computers for digital learning.',
        category: 'Charity',
        targetAmount: 15000,
        currentAmount: 9200,
        image: CAMPAIGN_IMAGES[4],
        status: 'active',
        deadline: futureDate(5),
        creatorId: creator._id,
      },
      {
        title: 'Retro Pixel RPG: "Shards of Aether"',
        shortDescription: 'A 16-bit JRPG inspired by classic SNES era games with a modern story twist.',
        description: 'Shards of Aether is an epic 40-hour pixel art RPG featuring turn-based combat, deep lore, hand-crafted dungeons, and a powerful soundtrack. Built by a passionate solo developer over 3 years, now ready for its final chapter.',
        category: 'Gaming',
        targetAmount: 4000,
        currentAmount: 3800,
        image: CAMPAIGN_IMAGES[5],
        status: 'active',
        deadline: futureDate(1),
        creatorId: creator._id,
      },
      {
        title: 'EcoBottle: Biodegradable Water Bottle',
        shortDescription: 'A water bottle made from seaweed that completely biodegrades in 6 weeks.',
        description: 'EcoBottle is the world\'s first mass-producible water bottle made entirely from sustainably harvested seaweed biopolymers. It holds 500ml, biodegrades in 6 weeks in soil or seawater, and has zero carbon footprint.',
        category: 'Tech',
        targetAmount: 6000,
        currentAmount: 1200,
        image: CAMPAIGN_IMAGES[6],
        status: 'active',
        deadline: futureDate(4),
        creatorId: creator._id,
      },
      {
        title: 'Mental Health App for Teenagers',
        shortDescription: 'A free, therapist-guided mental health companion app for ages 13–19.',
        description: 'An evidence-based mental health app specifically designed for teenagers, built in collaboration with 50 licensed therapists and adolescent psychologists. Offers daily check-ins, mood tracking, breathing exercises, and anonymous peer support forums.',
        category: 'Community',
        targetAmount: 9000,
        currentAmount: 5600,
        image: CAMPAIGN_IMAGES[7],
        status: 'active',
        deadline: futureDate(3),
        creatorId: creator._id,
      },
    ];

    await Campaign.insertMany(campaigns);
    console.log(`✓ ${campaigns.length} sample campaigns seeded`);

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────');
    console.log('Admin:     admin@fundverse.io     / admin123');
    console.log('Creator:   creator@fundverse.io   / creator123');
    console.log('Supporter: supporter@fundverse.io / supporter123');
    process.exit(0);
  } catch (error) {
    console.error('Database seeding failed:', error);
    process.exit(1);
  }
};

seed();
