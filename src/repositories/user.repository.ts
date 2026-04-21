import { AppError } from "../errors/appError";
import { User } from "../models/user.model";

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export class UserRepository {
  async create(input: CreateUserInput) {
    try {
      return await User.create({
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
      });
    } catch (error) {
      throw AppError.database("Failed to create user.", undefined, error);
    }
  }

  async findByEmail(email: string) {
    try {
      return await User.findOne({
        where: {
          email,
        },
      });
    } catch (error) {
      throw AppError.database("Failed to fetch user by email.", undefined, error);
    }
  }

  async findById(id: string) {
    try {
      return await User.findByPk(id);
    } catch (error) {
      throw AppError.database("Failed to fetch user.", undefined, error);
    }
  }
}
