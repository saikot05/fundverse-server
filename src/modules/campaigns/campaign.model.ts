import { Schema, model, Document, Types } from 'mongoose';

export interface ICampaign extends Document {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  image: string;
  creatorId: Types.ObjectId;
  status: 'pending' | 'active' | 'rejected' | 'completed';
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true },
    category: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    image: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'completed'],
      default: 'pending',
    },
    deadline: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Campaign = model<ICampaign>('Campaign', CampaignSchema);
