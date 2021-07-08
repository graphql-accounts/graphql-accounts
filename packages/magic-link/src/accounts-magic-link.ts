import {
  User,
  DatabaseInterface,
  AuthenticationService,
  LoginUserMagicLinkService,
  TokenRecord,
} from '@accounts/types';
import { AccountsServer, AccountsJsError, generateRandomToken } from '@accounts/server';
import { ErrorMessages } from './types';
import { errors, AuthenticateErrors, MagicLinkAuthenticatorErrors } from './errors';
import { isString } from './utils/validation';
import { RequestMagicLinkEmailErrors } from './errors';
import { getUserLoginTokens } from './utils/user';

export interface AccountsMagicLinkOptions {
  /**
   * Accounts token module errors
   */
  errors?: ErrorMessages;
  /**
   * The number of milliseconds from when a link with a login token is sent until token expires and user can't login with it.
   * Defaults to 15 minutes.
   */
  loginTokenExpiration?: number;
}

const defaultOptions = {
  errors,
  // 15 minutes - 15 * 60 * 1000
  loginTokenExpiration: 900000,
};

export default class AccountsMagicLink<CustomUser extends User = User>
  implements AuthenticationService {
  public serviceName = 'magicLink';
  public server!: AccountsServer;
  private options: AccountsMagicLinkOptions & typeof defaultOptions;
  private db!: DatabaseInterface<CustomUser>;

  constructor(options: AccountsMagicLinkOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  public setStore(store: DatabaseInterface<CustomUser>) {
    this.db = store;
  }

  public async requestMagicLinkEmail(email: string): Promise<void> {
    if (!email || !isString(email)) {
      throw new AccountsJsError(
        this.options.errors.invalidEmail,
        RequestMagicLinkEmailErrors.InvalidEmail
      );
    }

    const user = await this.db.findUserByEmail(email);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.userNotFound,
        RequestMagicLinkEmailErrors.UserNotFound
      );
    }

    // Remove pre-existing login tokens on user
    await this.db.removeAllLoginTokens(user.id);

    const token = generateRandomToken();
    await this.db.addLoginToken(user.id, email, token);

    const requestMagicLinkMail = this.server.prepareMail(
      email,
      token,
      this.server.sanitizeUser(user),
      'magiclink',
      this.server.options.emailTemplates.magicLink,
      this.server.options.emailTemplates.from
    );

    await this.server.options.sendMail(requestMagicLinkMail);
  }

  public async authenticate(params: LoginUserMagicLinkService): Promise<CustomUser> {
    const { token } = params;
    if (!token) {
      throw new AccountsJsError(
        this.options.errors.unrecognizedOptionsForLogin,
        AuthenticateErrors.UnrecognizedOptionsForLogin
      );
    }
    if (!isString(token)) {
      throw new AccountsJsError(this.options.errors.matchFailed, AuthenticateErrors.MatchFailed);
    }

    const foundUser = await this.magicLinkAuthenticator(token);

    // Remove all login tokens for user after login
    await this.db.removeAllLoginTokens(foundUser.id);

    return foundUser;
  }

  public isTokenExpired(tokenRecord: TokenRecord, expiryDate: number): boolean {
    return Number(tokenRecord.when) + expiryDate < Date.now();
  }

  private async magicLinkAuthenticator(token: string): Promise<CustomUser> {
    const foundUser: CustomUser | null = await this.db.findUserByLoginToken(token);

    if (!foundUser) {
      throw new AccountsJsError(
        this.options.errors.loginTokenExpired,
        MagicLinkAuthenticatorErrors.LoginTokenExpired
      );
    }

    const loginTokens = getUserLoginTokens(foundUser);
    const tokenRecord = loginTokens.find((t: TokenRecord) => t.token === token);
    if (!tokenRecord || this.isTokenExpired(tokenRecord, this.options.loginTokenExpiration)) {
      throw new AccountsJsError(
        this.options.errors.loginTokenExpired,
        MagicLinkAuthenticatorErrors.LoginTokenExpired
      );
    }

    return foundUser;
  }
}
