import { User } from "./user.model";
import { NotFoundError } from "../../utils/errors";

export class UserService {
  static async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    };
  }

  static async updateProfile(userId: string, updateData: { fullName?: string; avatar?: string | null }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found", "USER_NOT_FOUND");
    }

    if (updateData.fullName !== undefined) user.fullName = updateData.fullName;
    if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

    await user.save();

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    };
  }
}
