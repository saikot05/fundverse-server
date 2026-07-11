import { Schema, model, Document, Types } from 'mongoose';

export interface IContribution extends Document {
  campaignId: Types.ObjectId;
  supporterId: Types.ObjectId;
  amount: number;
  paymentId?: Types.ObjectId;
  createdAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    supporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Contribution = model<IContribution>('Contribution', ContributionSchema);
