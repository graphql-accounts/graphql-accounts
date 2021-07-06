import AccountsServer, { AccountsServerOptions } from '@accounts/server';
import { EmailTemplateType } from '@accounts/server/lib/types/email-template-type';
import {
  AuthenticationService,
  ConnectionInformations,
  HookListener,
  ImpersonationResult,
  LoginResult,
  Session,
  Tokens,
  User,
} from '@accounts/types';
import Emittery = require('emittery');

interface ImpersonateUser {
  userId?: string;
  username?: string;
  email?: string;
}
interface ICreateTokensReq {
  token: string;
  isImpersonated?: boolean;
  userId: string;
}

class MockServer implements AccountsServer {
  options: AccountsServer['options'];

  private services;
  private db;
  private hooks;
  constructor(options: AccountsServerOptions, services: Record<any, AuthenticationService>) {
    this.options = options as AccountsServer['options'];
  }

  getOptions(): AccountsServerOptions {
    return this.options;
  }
  getHooks(): Emittery {
    throw new Error('Method not implemented.');
  }
  on(eventName: string, callback: HookListener): () => void {
    throw new Error('Method not implemented.');
  }
  loginWithService(serviceName: string, params: any, infos: ConnectionInformations): Promise<LoginResult> {
    throw new Error('Method not implemented.');
  }
  loginWithUser(user: User, infos: ConnectionInformations): Promise<LoginResult> {
    throw new Error('Method not implemented.');
  }
  impersonate(
    accessToken: string,
    impersonated: ImpersonateUser,
    ip: string,
    userAgent: string,
  ): Promise<ImpersonationResult> {
    throw new Error('Method not implemented.');
  }
  refreshTokens(accessToken: string, refreshToken: string, ip: string, userAgent: string): Promise<LoginResult> {
    throw new Error('Method not implemented.');
  }
  createTokens({ token, isImpersonated, userId }: ICreateTokensReq): Tokens {
    throw new Error('Method not implemented.');
  }
  logout(accessToken: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  resumeSession(accessToken: string): Promise<User> {
    throw new Error('Method not implemented.');
  }
  findSessionByAccessToken(accessToken: string): Promise<Session> {
    throw new Error('Method not implemented.');
  }
  findUserById(userId: string): Promise<User> {
    throw new Error('Method not implemented.');
  }
  deactivateUser(userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  activateUser(userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  prepareMail(
    to: string,
    token: string,
    user: User,
    pathFragment: string,
    emailTemplate: EmailTemplateType,
    from: string,
  ) {
    throw new Error('Method not implemented.');
  }
  sanitizeUser(user: User): User {
    throw new Error('Method not implemented.');
  }
}
