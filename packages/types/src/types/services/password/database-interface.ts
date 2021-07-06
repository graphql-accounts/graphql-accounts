import { User } from '../../user';
import { CreateUserServicePassword } from './create-user';

export interface DatabaseInterfaceServicePassword<CustomUser extends User = User> {
  createUser(user: CreateUserServicePassword): Promise<string>;

  findUserByEmail(email: string): Promise<CustomUser | null>;

  findUserByUsername(username: string): Promise<CustomUser | null>;

  findUserByResetPasswordToken(token: string): Promise<CustomUser | null>;

  findUserByEmailVerificationToken(token: string): Promise<CustomUser | null>;

  findPasswordHash(userId: string): Promise<string | null>;

  setPassword(userId: string, newPassword: string): Promise<void>;

  setUsername(userId: string, newUsername: string): Promise<void>;

  addResetPasswordToken(
    userId: string,
    email: string,
    token: string,
    reason: string,
    expireAfterSeconds: number
  ): Promise<void>;

  addEmail(userId: string, newEmail: string, verified: boolean): Promise<void>;

  removeEmail(userId: string, email: string): Promise<void>;

  verifyEmail(userId: string, email: string): Promise<void>;

  addEmailVerificationToken(userId: string, email: string, token: string): Promise<void>;

  removeAllResetPasswordTokens(userId: string): Promise<void>;
}
