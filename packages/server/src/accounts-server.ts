import { pick, omit, isString, merge } from 'lodash';
import { verify, Secret } from 'jsonwebtoken';
import Emittery from 'emittery';
import {
  User,
  LoginResult,
  Tokens,
  Session,
  ImpersonationUserIdentity,
  ImpersonationResult,
  HookListener,
  DatabaseInterface,
  AuthenticationService,
  ConnectionInformations,
  DbInterface,
} from '@accounts/types';

import { generateAccessToken, generateRefreshToken, generateRandomToken } from './utils/tokens';

import { emailTemplates, sendMail } from './utils/email';
import { ServerHooks } from './utils/server-hooks';

import { AccountsServerOptions } from './types/accounts-server-options';
import { JwtData } from './types/jwt-data';
import { EmailTemplateType } from './types/email-template-type';
import { JwtPayload } from './types/jwt-payload';
import { AccountsJsError } from './utils/accounts-error';
import {
  AuthenticateWithServiceErrors,
  LoginWithServiceErrors,
  ImpersonateErrors,
  FindSessionByAccessTokenErrors,
  RefreshTokensErrors,
  LogoutErrors,
  ResumeSessionErrors,
} from './errors';
import { Inject } from '@graphql-modules/di';
import { ModuleConfig } from '@graphql-modules/core';

export class AuthenticationServices<CustomUser extends User = User> {
  [key: string]: AuthenticationService<CustomUser> | undefined;
}

const defaultOptions = {
  ambiguousErrorMessages: true,
  tokenSecret: 'secret',
  tokenConfigs: {
    accessToken: {
      expiresIn: '90m',
    },
    refreshToken: {
      expiresIn: '7d',
    },
  },
  emailTemplates,
  sendMail,
  siteUrl: 'http://localhost:3000',
  userObjectSanitizer: (user: User) => user,
  createNewSessionTokenOnRefresh: false,
  useInternalUserObjectSanitizer: true,
};

export class AccountsServer<CustomUser extends User = User> {
  public options: AccountsServerOptions<CustomUser> & typeof defaultOptions;
  private hooks: Emittery;

  constructor(
    @Inject(ModuleConfig('accounts-core'))
    options: AccountsServerOptions<CustomUser>,
    @Inject(AuthenticationServices) private services: AuthenticationServices<CustomUser>,
    @Inject(DbInterface) private db: DatabaseInterface<CustomUser>
  ) {
    this.options = merge({ ...defaultOptions }, options);
    if (this.options.tokenSecret === defaultOptions.tokenSecret) {
      console.log(`
You are using the default secret "${this.options.tokenSecret}" which is not secure.
Please change it with a strong random token.`);
    }
    if (this.options.ambiguousErrorMessages && this.options.enableAutologin) {
      throw new Error(
        `Can't enable autologin when ambiguous error messages are enabled (https://www.accountsjs.com/docs/api/server/globals#ambiguouserrormessages).
Please set ambiguousErrorMessages to false to be able to use autologin.`
      );
    }

    // Set the db to all services
    for (const service in this.services) {
      this.services[service]!.setStore(this.db);
      this.services[service]!.server = this;
    }

    // Initialize hooks
    this.hooks = new Emittery();
  }

  public getServices(): AuthenticationServices<CustomUser> {
    return this.services;
  }

  public getOptions(): AccountsServerOptions<CustomUser> {
    return this.options;
  }

  public getHooks(): Emittery {
    return this.hooks;
  }

  /**
   * Subscribe to an accounts-js event.
   * ```javascript
   * accountsServer.on(ServerHooks.ValidateLogin, ({ user }) => {
   *   // This hook is called every time a user try to login
   *   // You can use it to only allow users with verified email to login
   * });
   * ```
   */
  public on(eventName: string, callback: HookListener): () => void {
    this.hooks.on(eventName, callback);

    return () => this.hooks.off(eventName, callback);
  }

  /**
   * @description Try to authenticate the user for a given service
   * @throws {@link AuthenticateWithServiceErrors}
   */
  public async authenticateWithService(
    serviceName: string,
    params: any,
    infos: ConnectionInformations
  ): Promise<boolean> {
    const hooksInfo: any = {
      // The service name, such as “password” or “twitter”.
      service: serviceName,
      // The connection informations <ConnectionInformations>
      connection: infos,
      // Params received
      params,
    };
    try {
      if (!this.services[serviceName]) {
        throw new AccountsJsError(
          `No service with the name ${serviceName} was registered.`,
          AuthenticateWithServiceErrors.ServiceNotFound
        );
      }

      const user: CustomUser | null = await this.services[serviceName]!.authenticate(params);
      hooksInfo.user = user;
      if (!user) {
        throw new AccountsJsError(
          `Service ${serviceName} was not able to authenticate user`,
          AuthenticateWithServiceErrors.AuthenticationFailed
        );
      }
      if (user.deactivated) {
        throw new AccountsJsError(
          'Your account has been deactivated',
          AuthenticateWithServiceErrors.UserDeactivated
        );
      }

      this.hooks.emit(ServerHooks.AuthenticateSuccess, hooksInfo);
      return true;
    } catch (err) {
      this.hooks.emit(ServerHooks.AuthenticateError, { ...hooksInfo, error: err });
      throw err;
    }
  }

  /**
   * @throws {@link LoginWithServiceErrors}
   */
  public async loginWithService(
    serviceName: string,
    params: any,
    infos: ConnectionInformations
  ): Promise<LoginResult> {
    const hooksInfo: any = {
      // The service name, such as “password” or “twitter”.
      service: serviceName,
      // The connection informations <ConnectionInformations>
      connection: infos,
      // Params received
      params,
    };
    try {
      if (!this.services[serviceName]) {
        throw new AccountsJsError(
          `No service with the name ${serviceName} was registered.`,
          LoginWithServiceErrors.ServiceNotFound
        );
      }

      const user: CustomUser | null = await this.services[serviceName]!.authenticate(params);
      hooksInfo.user = user;
      if (!user) {
        throw new AccountsJsError(
          `Service ${serviceName} was not able to authenticate user`,
          LoginWithServiceErrors.AuthenticationFailed
        );
      }
      if (user.deactivated) {
        throw new AccountsJsError(
          'Your account has been deactivated',
          LoginWithServiceErrors.UserDeactivated
        );
      }

      // Let the user validate the login attempt
      await this.hooks.emitSerial(ServerHooks.ValidateLogin, hooksInfo);
      const loginResult = await this.loginWithUser(user, infos);
      this.hooks.emit(ServerHooks.LoginSuccess, hooksInfo);
      return loginResult;
    } catch (err) {
      this.hooks.emit(ServerHooks.LoginError, { ...hooksInfo, error: err });
      throw err;
    }
  }

  /**
   * @description Server use only.
   * This method creates a session without authenticating any user identity.
   * Any authentication should happen before calling this function.
   * @param {User} user - The user object.
   * @param {ConnectionInformations} infos - User's connection informations.
   * @returns {Promise<LoginResult>} - Session tokens and user object.
   */
  public async loginWithUser(
    user: CustomUser,
    infos: ConnectionInformations
  ): Promise<LoginResult> {
    const token = await this.createSessionToken(user);
    const sessionId = await this.db.createSession(user.id, token, infos);

    const { accessToken, refreshToken } = await this.createTokens({
      token,
      user,
    });

    return {
      sessionId,
      tokens: {
        refreshToken,
        accessToken,
      },
      user,
    };
  }

  /**
   * @description Impersonate to another user.
   * @param {string} accessToken - User access token.
   * @param {object} impersonated - impersonated user.
   * @param {ConnectionInformations} infos - User connection informations.
   * @returns {Promise<Object>} - ImpersonationResult
   * @throws {@link LoginWithServiceErrors}
   */
  public async impersonate(
    accessToken: string,
    impersonated: ImpersonationUserIdentity,
    infos: ConnectionInformations
  ): Promise<ImpersonationResult> {
    try {
      const session = await this.findSessionByAccessToken(accessToken);

      if (!session.valid) {
        throw new AccountsJsError(
          'Session is not valid for user',
          ImpersonateErrors.InvalidSession
        );
      }

      const user = await this.db.findUserById(session.userId);

      if (!user) {
        throw new AccountsJsError('User not found', ImpersonateErrors.UserNotFound);
      }

      let impersonatedUser;
      if (impersonated.userId) {
        impersonatedUser = await this.db.findUserById(impersonated.userId);
      } else if (impersonated.username) {
        impersonatedUser = await this.db.findUserByUsername(impersonated.username);
      } else if (impersonated.email) {
        impersonatedUser = await this.db.findUserByEmail(impersonated.email);
      }

      if (!impersonatedUser) {
        if (this.options.ambiguousErrorMessages) {
          return { authorized: false };
        }
        throw new AccountsJsError(
          `Impersonated user not found`,
          ImpersonateErrors.ImpersonatedUserNotFound
        );
      }

      if (!this.options.impersonationAuthorize) {
        return { authorized: false };
      }

      const isAuthorized = await this.options.impersonationAuthorize(user, impersonatedUser);

      if (!isAuthorized) {
        return { authorized: false };
      }

      const token = generateRandomToken();
      const newSessionId = await this.db.createSession(impersonatedUser.id, token, infos, {
        impersonatorUserId: user.id,
      });

      const impersonationTokens = await this.createTokens({
        token: newSessionId,
        isImpersonated: true,
        user,
      });
      const impersonationResult = {
        authorized: true,
        tokens: impersonationTokens,
        user: this.sanitizeUser(impersonatedUser),
      };

      this.hooks.emit(ServerHooks.ImpersonationSuccess, {
        user,
        impersonationResult,
      });

      return impersonationResult;
    } catch (e) {
      this.hooks.emit(ServerHooks.ImpersonationError, e);

      throw e;
    }
  }

  /**
   * @description Refresh a user token.
   * @param {string} accessToken - User access token.
   * @param {string} refreshToken - User refresh token.
   * @param {ConnectionInformations} infos - User connection informations.
   * @returns {Promise<Object>} - LoginResult.
   * @throws {@link RefreshTokensErrors}
   */
  public async refreshTokens(
    accessToken: string,
    refreshToken: string,
    infos: ConnectionInformations
  ): Promise<LoginResult> {
    try {
      if (!isString(accessToken) || !isString(refreshToken)) {
        throw new AccountsJsError(
          'An accessToken and refreshToken are required',
          RefreshTokensErrors.InvalidTokens
        );
      }

      let sessionToken: string;
      try {
        verify(refreshToken, this.getSecretOrPublicKey());
        const decodedAccessToken = verify(accessToken, this.getSecretOrPublicKey(), {
          ignoreExpiration: true,
        }) as { data: JwtData };
        sessionToken = decodedAccessToken.data.token;
      } catch (err) {
        throw new AccountsJsError(
          'Tokens are not valid',
          RefreshTokensErrors.TokenVerificationFailed
        );
      }

      const session: Session | null = await this.db.findSessionByToken(sessionToken);
      if (!session) {
        throw new AccountsJsError('Session not found', RefreshTokensErrors.SessionNotFound);
      }

      if (session.valid) {
        const user = await this.db.findUserById(session.userId);
        if (!user) {
          throw new AccountsJsError('User not found', RefreshTokensErrors.UserNotFound);
        }

        let newToken;
        if (this.options.createNewSessionTokenOnRefresh) {
          newToken = await this.createSessionToken(user);
        }

        const tokens = await this.createTokens({ token: newToken || sessionToken, user });
        await this.db.updateSession(session.id, infos, newToken);

        const result = {
          sessionId: session.id,
          tokens,
          user,
          infos,
        };

        this.hooks.emit(ServerHooks.RefreshTokensSuccess, result);

        return result;
      } else {
        throw new AccountsJsError('Session is no longer valid', RefreshTokensErrors.InvalidSession);
      }
    } catch (err) {
      this.hooks.emit(ServerHooks.RefreshTokensError, err);

      throw err;
    }
  }

  /**
   * @description Refresh a user token.
   * @param {string} token - User session token.
   * @param {boolean} isImpersonated - Should be true if impersonating another user.
   * @param {User} user - The user object.
   * @returns {Promise<Tokens>} - Return a new accessToken and refreshToken.
   */
  public async createTokens({
    token,
    isImpersonated = false,
    user,
  }: {
    token: string;
    isImpersonated?: boolean;
    user: CustomUser;
  }): Promise<Tokens> {
    const { tokenConfigs } = this.options;
    const jwtData: JwtData = {
      token,
      isImpersonated,
      userId: user.id,
    };

    const accessToken = generateAccessToken({
      payload: await this.createJwtPayload(jwtData, user),
      secret: this.getSecretOrPrivateKey(),
      config: tokenConfigs.accessToken,
    });
    const refreshToken = generateRefreshToken({
      secret: this.getSecretOrPrivateKey(),
      config: tokenConfigs.refreshToken,
    });

    return { accessToken, refreshToken };
  }

  /**
   * @description Logout a user and invalidate his session.
   * @param {string} accessToken - User access token.
   * @returns {Promise<void>} - Return a promise.
   * @throws {@link LogoutErrors}
   */
  public async logout(accessToken: string): Promise<void> {
    try {
      const session: Session = await this.findSessionByAccessToken(accessToken);

      if (session.valid) {
        await this.db.invalidateSession(session.id);
        this.hooks.emit(ServerHooks.LogoutSuccess, {
          session,
          accessToken,
        });
      } else {
        throw new AccountsJsError('Session is no longer valid', LogoutErrors.InvalidSession);
      }
    } catch (error) {
      this.hooks.emit(ServerHooks.LogoutError, error);

      throw error;
    }
  }

  /**
   * @throws {@link ResumeSessionErrors}
   */
  public async resumeSession(accessToken: string): Promise<CustomUser> {
    if (this.options.micro) {
      let decoded: any;

      if (!isString(accessToken)) {
        throw new Error('An access token is required');
      }

      try {
        const secretOrPublicKey =
          typeof this.options.tokenSecret === 'string'
            ? this.options.tokenSecret
            : this.options.tokenSecret.publicKey;
        decoded = verify(accessToken, secretOrPublicKey);
      } catch (err) {
        throw new Error('Access token is not valid');
      }

      return {
        id: decoded.data.userId,
      } as any;
    } else {
      try {
        const session: Session = await this.findSessionByAccessToken(accessToken);

        if (session.valid) {
          const user = await this.db.findUserById(session.userId);

          if (!user) {
            throw new AccountsJsError('User not found', ResumeSessionErrors.UserNotFound);
          }

          if (this.options.resumeSessionValidator) {
            try {
              await this.options.resumeSessionValidator(user, session);
            } catch (e) {
              throw new Error(e);
            }
          }

          this.hooks.emit(ServerHooks.ResumeSessionSuccess, { user, accessToken });

          return this.sanitizeUser(user);
        }

        this.hooks.emit(
          ServerHooks.ResumeSessionError,
          new AccountsJsError('Invalid Session', ResumeSessionErrors.InvalidSession)
        );

        throw new AccountsJsError('Invalid Session', ResumeSessionErrors.InvalidSession);
      } catch (e) {
        this.hooks.emit(ServerHooks.ResumeSessionError, e);

        throw e;
      }
    }
  }

  /**
   * @description Find a session by his token.
   * @param {string} accessToken
   * @returns {Promise<Session>} - Return a session.
   * @throws {@link FindSessionByAccessTokenErrors}
   */
  public async findSessionByAccessToken(accessToken: string): Promise<Session> {
    if (!isString(accessToken)) {
      throw new AccountsJsError(
        'An accessToken is required',
        FindSessionByAccessTokenErrors.InvalidToken
      );
    }

    let sessionToken: string;
    try {
      const decodedAccessToken = verify(accessToken, this.getSecretOrPublicKey()) as {
        data: JwtData;
      };
      sessionToken = decodedAccessToken.data.token;
    } catch (err) {
      throw new AccountsJsError(
        'Tokens are not valid',
        FindSessionByAccessTokenErrors.TokenVerificationFailed
      );
    }

    const session: Session | null = await this.db.findSessionByToken(sessionToken);
    if (!session) {
      throw new AccountsJsError(
        'Session not found',
        FindSessionByAccessTokenErrors.SessionNotFound
      );
    }

    return session;
  }

  /**
   * @description Find a user by his id.
   * @param {string} userId - User id.
   * @returns {Promise<Object>} - Return a user or null if not found.
   */
  public findUserById(userId: string): Promise<CustomUser | null> {
    return this.db.findUserById(userId);
  }

  /**
   * @description Deactivate a user, the user will not be able to login until his account is reactivated.
   * @param {string} userId - User id.
   * @returns {Promise<void>} - Return a Promise.
   */
  public async deactivateUser(userId: string): Promise<void> {
    return this.db.setUserDeactivated(userId, true);
  }

  /**
   * @description Activate a user.
   * @param {string} userId - User id.
   * @returns {Promise<void>} - Return a Promise.
   */
  public async activateUser(userId: string): Promise<void> {
    return this.db.setUserDeactivated(userId, false);
  }

  public prepareMail(
    to: string,
    token: string,
    user: CustomUser,
    pathFragment: string,
    emailTemplate: EmailTemplateType,
    from: string
  ): any {
    if (this.options.prepareMail) {
      return this.options.prepareMail(to, token, user, pathFragment, emailTemplate, from);
    }
    return this.defaultPrepareEmail(to, token, user, pathFragment, emailTemplate, from);
  }

  public sanitizeUser(user: CustomUser): CustomUser {
    const { userObjectSanitizer } = this.options;
    const baseUser = this.options.useInternalUserObjectSanitizer
      ? this.internalUserSanitizer(user)
      : user;

    return userObjectSanitizer(baseUser, omit as any, pick as any);
  }

  private internalUserSanitizer(user: CustomUser): CustomUser {
    return omit(user, ['services']) as any;
  }

  private defaultPrepareEmail(
    to: string,
    token: string,
    user: CustomUser,
    pathFragment: string,
    emailTemplate: EmailTemplateType,
    from: string
  ): object {
    const tokenizedUrl = this.defaultCreateTokenizedUrl(pathFragment, token);
    return {
      from: emailTemplate.from || from,
      to,
      subject: emailTemplate.subject(user),
      text: emailTemplate.text(user, tokenizedUrl),
      html: emailTemplate.html && emailTemplate.html(user, tokenizedUrl),
    };
  }

  private defaultCreateTokenizedUrl(pathFragment: string, token: string): string {
    const siteUrl = this.options.siteUrl;
    return `${siteUrl}/${pathFragment}/${token}`;
  }

  private async createSessionToken(user: CustomUser): Promise<string> {
    return this.options.tokenCreator
      ? this.options.tokenCreator.createToken(user)
      : generateRandomToken();
  }

  private async createJwtPayload(data: JwtData, user: CustomUser): Promise<JwtPayload> {
    return this.options.createJwtPayload
      ? {
          ...(await this.options.createJwtPayload(data, user)),
          data,
        }
      : { data };
  }

  private getSecretOrPublicKey(): Secret {
    return typeof this.options.tokenSecret === 'string'
      ? this.options.tokenSecret
      : this.options.tokenSecret.publicKey;
  }

  private getSecretOrPrivateKey(): Secret {
    return typeof this.options.tokenSecret === 'string'
      ? this.options.tokenSecret
      : this.options.tokenSecret.privateKey;
  }
}

export default AccountsServer;
