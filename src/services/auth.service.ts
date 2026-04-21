import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/appError";
import { comparePassword, hashPassword, signAccessToken } from "../utils/auth";
import { User } from "../models/user.model";

type PublicUserDto = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export class AuthService {
  private userRepo = new UserRepository();

  private normalizeUser(user: User): PublicUserDto {
    return {
      id: user.get("id") as string,
      name: user.get("name") as string,
      email: user.get("email") as string,
      createdAt: (user.get("createdAt") as Date).toISOString(),
      updatedAt: (user.get("updatedAt") as Date).toISOString(),
    };
  }

  async register(input: { name?: string; email?: string; password?: string }) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();

    if (!name) {
      throw AppError.validation("Name is required.");
    }

    if (!email) {
      throw AppError.validation("Email is required.");
    }

    if (!password || password.length < 8) {
      throw AppError.validation("Password must be at least 8 characters long.");
    }

    const existing = await this.userRepo.findByEmail(email);

    if (existing) {
      throw AppError.validation("A user with this email already exists.");
    }

    const user = await this.userRepo.create({
      name,
      email,
      passwordHash: await hashPassword(password),
    });

    return {
      user: this.normalizeUser(user),
    };
  }

  async login(input: { email?: string; password?: string }) {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();

    if (!email || !password) {
      throw AppError.badRequest("Email and password are required.");
    }

    const user = await this.userRepo.findByEmail(email);

    if (!user) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    const passwordHash = user.get("passwordHash") as string;
    const isValidPassword = await comparePassword(password, passwordHash);

    if (!isValidPassword) {
      throw AppError.unauthorized("Invalid email or password.");
    }

    const normalized = this.normalizeUser(user);

    return {
      accessToken: signAccessToken({
        id: normalized.id,
        email: normalized.email,
        name: normalized.name,
      }),
      user: normalized,
    };
  }
}
