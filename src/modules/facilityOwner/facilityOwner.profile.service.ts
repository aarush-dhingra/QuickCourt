import mongoose from "mongoose";
import { User } from "../users/user.model";
import { NotFoundError } from "../../utils/errors";
import { UpdateProfileInput } from "./facilityOwner.profile.validation";

export class FacilityOwnerProfileService {
  /**
   * Returns the profile of the authenticated facility owner.
   * Password hash is excluded.
   */
  static async getProfile(ownerId: string) {
    const user = await User.findById(ownerId)
      .select("-passwordHash")
      .lean();

    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Updates allowed profile fields for the facility owner.
   * Only `fullName` and `avatar` may be changed via this endpoint.
   */
  static async updateProfile(ownerId: string, input: UpdateProfileInput) {
    const user = await User.findById(ownerId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.avatar !== undefined) user.avatar = input.avatar ?? null;

    await user.save();

    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      updatedAt: user.updatedAt,
    };
  }
}
