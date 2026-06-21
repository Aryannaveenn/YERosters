import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@yerosters.com' });
  if (existing) {
    console.log('Admin already exists');
  } else {
    await User.create({
      name: 'Admin',
      email: 'admin@yerosters.com',
      password: 'admin123',
      role: 'admin',
    });
    console.log('Admin user created (admin@yerosters.com / admin123)');
  }

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
