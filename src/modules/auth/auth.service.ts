import { User, IUser } from "../users/user.model";
import { OtpVerification } from "./otp.model";
import { hashPassword, comparePassword } from "../../utils/password";
import { generateOtp, hashOtp, compareOtp } from "../../utils/otp";
import { generateToken } from "../../utils/jwt";
import { sendOtpEmail } from "../../utils/email";
import { env } from "../../config/env";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../utils/errors";
import { RegisterInput, LoginInput, AuthResponse } from "./auth.types";

export class AuthService {
  static async register(input: RegisterInput): Promise<{ email: string; requiresOtpVerification: boolean }> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new ConflictError("Email already exists", "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      avatar: input.avatar || null,
      role: "USER",
      isEmailVerified: false,
      isActive: true,
    });

    // Generate and send OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    // Invalidate previous OTPs
    await OtpVerification.updateMany(
      { email: input.email, purpose: "SIGNUP", verified: false },
      { verified: true }
    );

    await OtpVerification.create({
      email: input.email,
      otpHash,
      purpose: "SIGNUP",
      expiresAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    await sendOtpEmail(input.email, otp);

    return {
      email: user.email,
      requiresOtpVerification: true,
    };
  }

  static async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (user.isEmailVerified) {
      throw new BadRequestError("Email already verified", "EMAIL_ALREADY_EXISTS");
    }

    const otpRecord = await OtpVerification.findOne({
      email,
      purpose: "SIGNUP",
      verified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      throw new BadRequestError("No OTP found. Please request a new one.", "INVALID_OTP");
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestError("OTP has expired", "OTP_EXPIRED");
    }

    if (otpRecord.attempts >= 5) {
      throw new BadRequestError("Too many OTP attempts", "OTP_EXPIRED");
    }

    const isValid = await compareOtp(otp, otpRecord.otpHash);
    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new BadRequestError("Invalid OTP", "INVALID_OTP");
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Mark user as verified
    user.isEmailVerified = true;
    await user.save();

    // Generate JWT
    const token = generateToken({ sub: user._id.toString(), role: user.role });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }

  static async resendOtp(email: string): Promise<{ message: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (user.isEmailVerified) {
      throw new BadRequestError("Email already verified", "EMAIL_ALREADY_EXISTS");
    }

    // Rate limit check - max 3 OTPs per 10 minutes
    const recentOtps = await OtpVerification.countDocuments({
      email,
      purpose: "SIGNUP",
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    });

    if (recentOtps >= 3) {
      throw new BadRequestError("Too many OTP requests. Please try again later.", "OTP_RATE_LIMITED");
    }

    // Invalidate previous OTPs
    await OtpVerification.updateMany(
      { email, purpose: "SIGNUP", verified: false },
      { verified: true }
    );

    // Generate new OTP
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    await OtpVerification.create({
      email,
      otpHash,
      purpose: "SIGNUP",
      expiresAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    await sendOtpEmail(email, otp);

    return { message: "OTP sent successfully." };
  }

  static async login(input: LoginInput): Promise<AuthResponse> {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    if (!user) {
      throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account is inactive", "USER_INACTIVE");
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenError("Email not verified", "EMAIL_NOT_VERIFIED");
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    const token = generateToken({ sub: user._id.toString(), role: user.role });

    return {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }

  static async getMe(userId: string): Promise<{
    id: string;
    email: string;
    fullName: string;
    avatar: string | null;
    role: string;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      role: user.role,
    };
  }

  static async logout(): Promise<{ message: string }> {
    return { message: "Logged out successfully." };
  }
}
