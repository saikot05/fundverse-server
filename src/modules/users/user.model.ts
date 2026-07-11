import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'supporter' | 'creator' | 'admin';
  credits: number;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    role: { type: String, enum: ['supporter', 'creator', 'admin'], default: 'supporter' },
    credits: { type: Number, default: 0 },
    image: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
