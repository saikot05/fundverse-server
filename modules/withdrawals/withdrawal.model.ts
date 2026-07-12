import { Schema, model, Document, Types } from 'mongoose';

export interface IWithdrawal extends Document {
  creatorId: Types.ObjectId;
  campaignId: Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    routingNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    bankDetails: {
      accountName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      bankName: { type: String, required: true },
      routingNumber: { type: String },
    },
  },
  { timestamps: true }
);

export const Withdrawal = model<IWithdrawal>('Withdrawal', WithdrawalSchema);
