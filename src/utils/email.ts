import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || undefined,
  port: env.SMTP_PORT || undefined,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      }
    : undefined,
});

export const sendOtpEmail = async (
  to: string,
  otp: string
): Promise<void> => {
  if (env.DEV_OTP_ENABLED) {
    console.log(`[DEV OTP] Email: ${to}, OTP: ${otp}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: "QuickCourt - Email Verification OTP",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP for email verification is: <strong>${otp}</strong></p>
        <p>This OTP expires in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
  }
};
