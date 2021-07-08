import {
  LoginResult,
  ImpersonationUserIdentity,
  ImpersonationResult,
  CreateUser,
  User,
  CreateUserResult,
} from '@accounts/types';
import { AccountsClient } from './accounts-client';

export interface TransportInterface {
  client: AccountsClient;
  createUser(user: CreateUser): Promise<CreateUserResult>;
  authenticateWithService(
    service: string,
    authenticateParams: {
      [key: string]: string | object;
    }
  ): Promise<boolean>;
  loginWithService(
    service: string,
    authenticateParams: {
      [key: string]: string | object;
    }
  ): Promise<LoginResult>;
  logout(): Promise<void>;
  getUser(): Promise<User>;
  refreshTokens(accessToken: string, refreshToken: string): Promise<LoginResult>;
  verifyEmail(token: string): Promise<void>;
  sendResetPasswordEmail(email: string): Promise<void>;
  sendVerificationEmail(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<LoginResult | null>;
  addEmail(newEmail: string): Promise<void>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
  impersonate(token: string, impersonated: ImpersonationUserIdentity): Promise<ImpersonationResult>;
  requestMagicLinkEmail(email: string): Promise<void>;
}
