import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  amount: number;
  creditsPurchased: number;
  stripePaymentIntentId: string;
  status: 'succeeded' | 'failed' | 'pending';
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    creditsPurchased: { type: Number, required: true },
    stripePaymentIntentId: { type: String, required: true },
    status: {
      type: String,
      enum: ['succeeded', 'failed', 'pending'],
      default: 'pending',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Payment = model<IPayment>('Payment', PaymentSchema);
