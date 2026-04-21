import { AppError } from "../errors/appError";
import { User } from "../models/user.model";
import { UserRepository } from "../repositories/user.repository";

export class UserService {
  private userRepo = new UserRepository();

  private normalizeUser(user: User) {
    return {
      id: user.get("id") as string,
      name: user.get("name") as string,
      email: user.get("email") as string,
      createdAt: (user.get("createdAt") as Date).toISOString(),
      updatedAt: (user.get("updatedAt") as Date).toISOString(),
    };
  }

  async getCurrentUser(userId?: string) {
    if (!userId) {
      throw AppError.unauthorized("Authentication is required.");
    }

    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw AppError.unauthorized("Authenticated user no longer exists.");
    }

    return this.normalizeUser(user);
  }
}
