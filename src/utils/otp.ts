import crypto from "crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export const generateOtp = (): string => {
  if (env.DEV_OTP_ENABLED) {
    return env.DEV_OTP;
  }
  const length = env.OTP_LENGTH;
  const max = Math.pow(10, length) - 1;
  const min = Math.pow(10, length - 1);
  const otp = crypto.randomInt(min, max + 1);
  return otp.toString();
};

export const hashOtp = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

export const compareOtp = async (otp: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(otp, hash);
};
