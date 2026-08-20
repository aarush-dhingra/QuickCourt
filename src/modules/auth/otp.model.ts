import mongoose, { Schema, Document } from "mongoose";

export interface IOtpVerification extends Document {
  email: string;
  otpHash: string;
  purpose: "SIGNUP";
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerification>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["SIGNUP"],
      default: "SIGNUP",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

otpVerificationSchema.index({ email: 1, purpose: 1 });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpVerification = mongoose.model<IOtpVerification>(
  "OtpVerification",
  otpVerificationSchema
);
