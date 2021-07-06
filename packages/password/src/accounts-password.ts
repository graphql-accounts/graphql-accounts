import {
  User,
  LoginUserIdentity,
  EmailRecord,
  TokenRecord,
  DatabaseInterface,
  AuthenticationService,
  ConnectionInformations,
  LoginResult,
  CreateUserServicePassword,
  LoginUserPasswordService,
} from '@accounts/types';
import { TwoFactor, AccountsTwoFactorOptions, getUserTwoFactorService } from '@accounts/two-factor';
import {
  AccountsServer,
  ServerHooks,
  generateRandomToken,
  AccountsJsError,
} from '@accounts/server';
import {
  getUserResetTokens,
  getUserVerificationTokens,
  bcryptPassword,
  verifyPassword,
  isEmail,
} from './utils';
import { ErrorMessages } from './types';
import {
  errors,
  AddEmailErrors,
  AuthenticateErrors,
  ChangePasswordErrors,
  CreateUserErrors,
  PasswordAuthenticatorErrors,
  ResetPasswordErrors,
  SendVerificationEmailErrors,
  SendResetPasswordEmailErrors,
  SendEnrollmentEmailErrors,
  VerifyEmailErrors,
} from './errors';
import { isObject, isString } from './utils/validation';

export interface AccountsPasswordOptions {
  /**
   * Two factor options passed down to the @accounts/two-factor service.
   */
  twoFactor?: AccountsTwoFactorOptions;
  /**
   * The number of milliseconds from when a link to verify the user email is sent until token expires and user can't verify his email with the link anymore.
   * Defaults to 3 days.
   */
  verifyEmailTokenExpiration?: number;
  /**
   * The number of milliseconds from when a link to reset password is sent until token expires and user can't reset password with the link anymore.
   * Defaults to 3 days.
   */
  passwordResetTokenExpiration?: number;
  /**
   * The number of milliseconds from when a link to set initial password is sent until token expires and user can't set password with the link anymore.
   * Defaults to 30 days.
   */
  passwordEnrollTokenExpiration?: number;
  /**
   * Accounts password module errors
   */
  errors?: ErrorMessages;
  /**
   * Notify a user after his password has been changed.
   * This email is sent when the user reset his password and when he change it.
   * Default to true.
   */
  notifyUserAfterPasswordChanged?: boolean;
  /**
   * Default to false.
   */
  returnTokensAfterResetPassword?: boolean;
  /**
   * Invalidate existing sessions after password has been reset
   * Default to true.
   */
  invalidateAllSessionsAfterPasswordReset?: boolean;
  /**
   * Invalidate existing sessions after password has been changed
   * Default to false.
   */
  invalidateAllSessionsAfterPasswordChanged?: boolean;
  /**
   * Will remove all password reset tokens from the db after a password has been changed.
   * Default to true.
   */
  removeAllResetPasswordTokensAfterPasswordChanged?: boolean;
  /**
   * Will automatically send a verification email after signup.
   * Default to false.
   */
  sendVerificationEmailAfterSignup?: boolean;
  /**
   * Function that will validate the user object during `createUser`.
   * The user returned from this function will be directly inserted in the database so be careful when you whitelist the fields,
   * By default we only allow `username`, `email` and `password` fields.
   */
  validateNewUser?: (
    user: CreateUserServicePassword
  ) => Promise<CreateUserServicePassword> | CreateUserServicePassword;
  /**
   * Function that check if the email is a valid email.
   * This function will be called when you call `createUser` and `addEmail`.
   */
  validateEmail?: (email?: string) => boolean;
  /**
   * Function that check if the password is valid.
   * This function will be called when you call `createUser` and `changePassword`.
   */
  validatePassword?: (password?: string) => boolean;
  /**
   * Function that check if the username is a valid username.
   * This function will be called when you call `createUser`.
   */
  validateUsername?: (username?: string) => boolean;
  /**
   * Function called to hash the user password, the password returned will be saved
   * in the database directly. By default we use bcrypt to hash the password.
   * Use this option alongside `verifyPassword` if you want to use argon2 for example.
   */
  hashPassword?: (password: string) => Promise<string>;
  /**
   * Function called to verify the password hash. By default we use bcrypt to hash the password.
   * Use this option alongside `hashPassword` if you want to use argon2 for example.
   */
  verifyPassword?: (password: string, hash: string) => Promise<boolean>;
}

const defaultOptions = {
  // 3 days - 3 * 24 * 60 * 60 * 1000
  verifyEmailTokenExpiration: 259200000,
  // 3 days - 3 * 24 * 60 * 60 * 1000
  passwordResetTokenExpiration: 259200000,
  // 30 days - 30 * 24 * 60 * 60 * 1000
  passwordEnrollTokenExpiration: 2592000000,
  notifyUserAfterPasswordChanged: true,
  returnTokensAfterResetPassword: false,
  invalidateAllSessionsAfterPasswordReset: true,
  invalidateAllSessionsAfterPasswordChanged: false,
  removeAllResetPasswordTokensAfterPasswordChanged: true,
  errors,
  sendVerificationEmailAfterSignup: false,
  validateEmail(email?: string): boolean {
    return isString(email) && isEmail(email);
  },
  validatePassword(password?: string): boolean {
    return isString(password) && password !== '';
  },
  validateUsername(username?: string): boolean {
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9]*$/;
    return isString(username) && usernameRegex.test(username);
  },
  // If user does not provide the validateNewUser function only allow some fields
  validateNewUser(
    user: CreateUserServicePassword
  ): Promise<CreateUserServicePassword> | CreateUserServicePassword {
    const safeUser: CreateUserServicePassword = { password: user.password };
    if (user.username) {
      safeUser.username = user.username;
    }
    if (user.email) {
      safeUser.email = user.email;
    }
    return safeUser;
  },
  hashPassword: bcryptPassword,
  verifyPassword,
};

export default class AccountsPassword<CustomUser extends User = User>
  implements AuthenticationService {
  public serviceName = 'password';
  public server!: AccountsServer;
  public twoFactor: TwoFactor;
  private options: AccountsPasswordOptions & typeof defaultOptions;
  private db!: DatabaseInterface<CustomUser>;

  constructor(options: AccountsPasswordOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.twoFactor = new TwoFactor(options.twoFactor);
  }

  public setStore(store: DatabaseInterface<CustomUser>) {
    this.db = store;
    this.twoFactor.setStore(store);
  }

  public async authenticate(params: LoginUserPasswordService): Promise<CustomUser> {
    const { user, password, code } = params;
    if (!user || !password) {
      throw new AccountsJsError(
        this.options.errors.unrecognizedOptionsForLogin,
        AuthenticateErrors.UnrecognizedOptionsForLogin
      );
    }
    if ((!isString(user) && !isObject(user)) || !isString(password)) {
      throw new AccountsJsError(this.options.errors.matchFailed, AuthenticateErrors.MatchFailed);
    }

    const foundUser = await this.passwordAuthenticator(user, password);

    // If user activated two factor authentication try with the code
    if (getUserTwoFactorService(foundUser)) {
      await this.twoFactor.authenticate(foundUser, code!);
    }

    return foundUser;
  }

  /**
   * @description Find a user by one of his emails.
   * @param {string} email - User email.
   * @returns {Promise<Object>} - Return a user or null if not found.
   */
  public findUserByEmail(email: string): Promise<CustomUser | null> {
    return this.db.findUserByEmail(email);
  }

  /**
   * @description Find a user by his username.
   * @param {string} username - User username.
   * @returns {Promise<Object>} - Return a user or null if not found.
   */
  public findUserByUsername(username: string): Promise<CustomUser | null> {
    return this.db.findUserByUsername(username);
  }

  /**
   * @description Add an email address for a user.
   * It will trigger the `validateEmail` option and throw if email is invalid.
   * Use this instead of directly updating the database.
   * @param {string} userId - User id.
   * @param {string} newEmail - A new email address for the user.
   * @param {boolean} [verified] - Whether the new email address should be marked as verified.
   * Defaults to false.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link AddEmailErrors}
   */
  public addEmail(userId: string, newEmail: string, verified = false): Promise<void> {
    if (!this.options.validateEmail(newEmail)) {
      throw new AccountsJsError(this.options.errors.invalidEmail, AddEmailErrors.InvalidEmail);
    }
    return this.db.addEmail(userId, newEmail, verified);
  }

  /**
   * @description Remove an email address for a user.
   * Use this instead of directly updating the database.
   * @param {string} userId - User id.
   * @param {string} email - The email address to remove.
   * @returns {Promise<void>} - Return a Promise.
   */
  public removeEmail(userId: string, email: string): Promise<void> {
    return this.db.removeEmail(userId, email);
  }

  /**
   * @description Marks the user's email address as verified.
   * @param {string} token - The token retrieved from the verification URL.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link VerifyEmailErrors}
   */
  public async verifyEmail(token: string): Promise<void> {
    if (!token || !isString(token)) {
      throw new AccountsJsError(this.options.errors.invalidToken, VerifyEmailErrors.InvalidToken);
    }

    const user = await this.db.findUserByEmailVerificationToken(token);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.verifyEmailLinkExpired,
        VerifyEmailErrors.VerifyEmailLinkExpired
      );
    }

    const verificationTokens = getUserVerificationTokens(user);
    const tokenRecord = verificationTokens.find((t: TokenRecord) => t.token === token);
    if (!tokenRecord || this.isTokenExpired(tokenRecord, this.options.verifyEmailTokenExpiration)) {
      throw new AccountsJsError(
        this.options.errors.verifyEmailLinkExpired,
        VerifyEmailErrors.VerifyEmailLinkExpired
      );
    }

    const emailRecord = user.emails?.find((e: EmailRecord) => e.address === tokenRecord.address);
    if (!emailRecord) {
      throw new AccountsJsError(
        this.options.errors.verifyEmailLinkUnknownAddress,
        VerifyEmailErrors.VerifyEmailLinkUnknownAddress
      );
    }
    await this.db.verifyEmail(user.id, emailRecord.address);
  }

  /**
   * @description Reset the password for a user using a token received in email.
   * It will trigger the `validatePassword` option and throw if password is invalid.
   * @param {string} token - The token retrieved from the reset password URL.
   * @param {string} newPassword - A new password for the user.
   * @returns {Promise<LoginResult | null>} - If `returnTokensAfterResetPassword` option is true return the session tokens and user object, otherwise return null.
   * @throws {@link ResetPasswordErrors}
   */
  public async resetPassword(
    token: string,
    newPassword: string,
    infos: ConnectionInformations
  ): Promise<LoginResult | null> {
    if (!token || !isString(token)) {
      throw new AccountsJsError(this.options.errors.invalidToken, ResetPasswordErrors.InvalidToken);
    }
    if (!this.options.validatePassword(newPassword)) {
      throw new AccountsJsError(
        this.options.errors.invalidNewPassword,
        ResetPasswordErrors.InvalidNewPassword
      );
    }

    const user = await this.db.findUserByResetPasswordToken(token);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.resetPasswordLinkExpired,
        ResetPasswordErrors.ResetPasswordLinkExpired
      );
    }

    const resetTokens = getUserResetTokens(user);
    const resetTokenRecord = resetTokens.find((t) => t.token === token);

    if (
      !resetTokenRecord ||
      this.isTokenExpired(
        resetTokenRecord,
        resetTokenRecord.reason === 'enroll'
          ? this.options.passwordEnrollTokenExpiration
          : this.options.passwordResetTokenExpiration
      )
    ) {
      throw new AccountsJsError(
        this.options.errors.resetPasswordLinkExpired,
        ResetPasswordErrors.ResetPasswordLinkExpired
      );
    }

    const emails = user.emails || [];
    if (!emails.map((email: EmailRecord) => email.address).includes(resetTokenRecord.address)) {
      throw new AccountsJsError(
        this.options.errors.resetPasswordLinkUnknownAddress,
        ResetPasswordErrors.ResetPasswordLinkUnknownAddress
      );
    }

    const password = await this.options.hashPassword(newPassword);
    // Change the user password and remove the other reset tokens
    await this.db.setPassword(user.id, password);
    await this.db.removeAllResetPasswordTokens(user.id);

    await this.server.getHooks().emit(ServerHooks.ResetPasswordSuccess, user);

    // If user clicked on an enrollment link we can verify his email
    if (resetTokenRecord.reason === 'enroll') {
      await this.db.verifyEmail(user.id, resetTokenRecord.address);
    }

    // Changing the password should invalidate existing sessions
    if (this.options.invalidateAllSessionsAfterPasswordReset) {
      await this.db.invalidateAllSessions(user.id);
    }

    if (this.options.notifyUserAfterPasswordChanged) {
      const address = user.emails && user.emails[0].address;
      if (!address) {
        throw new AccountsJsError(this.options.errors.noEmailSet, ResetPasswordErrors.NoEmailSet);
      }

      const passwordChangedMail = this.server.prepareMail(
        address,
        '',
        this.server.sanitizeUser(user),
        '',
        this.server.options.emailTemplates.passwordChanged,
        this.server.options.emailTemplates.from
      );
      await this.server.options.sendMail(passwordChangedMail);
    }

    if (this.options.returnTokensAfterResetPassword) {
      return this.server.loginWithUser(user, infos);
    }
    return null;
  }

  /**
   * @description Change the password for a user.
   * @param {string} userId - User id.
   * @param {string} newPassword - A new password for the user.
   * @returns {Promise<void>} - Return a Promise.
   */
  public async setPassword(userId: string, newPassword: string): Promise<void> {
    const password = await this.options.hashPassword(newPassword);
    return this.db.setPassword(userId, password);
  }

  /**
   * @description Change the current user's password.
   * It will trigger the `validatePassword` option and throw if password is invalid.
   * @param {string} userId - User id.
   * @param {string} oldPassword - The user's current password.
   * @param {string} newPassword - A new password for the user.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link ChangePasswordErrors}
   */
  public async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    if (!this.options.validatePassword(newPassword)) {
      throw new AccountsJsError(
        this.options.errors.invalidPassword,
        ChangePasswordErrors.InvalidPassword
      );
    }

    const user = await this.passwordAuthenticator({ id: userId }, oldPassword);

    const password = await this.options.hashPassword(newPassword);
    await this.db.setPassword(userId, password);

    await this.server.getHooks().emit(ServerHooks.ChangePasswordSuccess, user);

    if (this.options.invalidateAllSessionsAfterPasswordChanged) {
      await this.db.invalidateAllSessions(user.id);
    }

    if (this.options.removeAllResetPasswordTokensAfterPasswordChanged) {
      await this.db.removeAllResetPasswordTokens(user.id);
    }

    if (this.options.notifyUserAfterPasswordChanged) {
      const address = user.emails && user.emails[0].address;
      if (!address) {
        throw new AccountsJsError(this.options.errors.noEmailSet, ChangePasswordErrors.NoEmailSet);
      }

      const passwordChangedMail = this.server.prepareMail(
        address,
        '',
        this.server.sanitizeUser(user),
        '',
        this.server.options.emailTemplates.passwordChanged,
        this.server.options.emailTemplates.from
      );
      await this.server.options.sendMail(passwordChangedMail);
    }
  }

  /**
   * @description Send an email with a link the user can use verify their email address.
   * @param {string} [address] - Which address of the user's to send the email to.
   * This address must be in the user's emails list.
   * Defaults to the first unverified email in the list.
   * If the address is already verified we do not send any email.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link SendVerificationEmailErrors}
   */
  public async sendVerificationEmail(address: string): Promise<void> {
    if (!address || !isString(address)) {
      throw new AccountsJsError(
        this.options.errors.invalidEmail,
        SendVerificationEmailErrors.InvalidEmail
      );
    }

    const user = await this.db.findUserByEmail(address);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.userNotFound,
        SendVerificationEmailErrors.UserNotFound
      );
    }

    // Do not send an email if the address is already verified
    const emailRecord = user.emails?.find(
      (email: EmailRecord) => email.address.toLowerCase() === address.toLocaleLowerCase()
    );
    if (!emailRecord || emailRecord.verified) {
      return;
    }

    const token = generateRandomToken();
    await this.db.addEmailVerificationToken(user.id, address, token);

    const resetPasswordMail = this.server.prepareMail(
      address,
      token,
      this.server.sanitizeUser(user),
      'verify-email',
      this.server.options.emailTemplates.verifyEmail,
      this.server.options.emailTemplates.from
    );

    await this.server.options.sendMail(resetPasswordMail);
  }

  /**
   * @description Send an email with a link the user can use to reset their password.
   * @param {string} [address] - Which address of the user's to send the email to.
   * This address must be in the user's emails list.
   * Defaults to the first email in the list.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link SendResetPasswordEmailErrors}
   */
  public async sendResetPasswordEmail(address: string): Promise<void> {
    if (!address || !isString(address)) {
      throw new AccountsJsError(
        this.options.errors.invalidEmail,
        SendResetPasswordEmailErrors.InvalidEmail
      );
    }

    const user = await this.db.findUserByEmail(address);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.userNotFound,
        SendResetPasswordEmailErrors.UserNotFound
      );
    }
    const token = generateRandomToken();
    await this.db.addResetPasswordToken(
      user.id,
      address,
      token,
      'reset',
      this.options.passwordResetTokenExpiration / 1000
    );

    const resetPasswordMail = this.server.prepareMail(
      address,
      token,
      this.server.sanitizeUser(user),
      'reset-password',
      this.server.options.emailTemplates.resetPassword,
      this.server.options.emailTemplates.from
    );

    await this.server.options.sendMail(resetPasswordMail);
  }

  /**
   * @description Send an email with a link the user can use to set their initial password.
   * The user's email will be verified after clicking on the link.
   * @param {string} [address] - Which address of the user's to send the email to.
   * This address must be in the user's emails list.
   * Defaults to the first email in the list.
   * @returns {Promise<void>} - Return a Promise.
   * @throws {@link SendEnrollmentEmailErrors}
   */
  public async sendEnrollmentEmail(address: string): Promise<void> {
    if (!address || !isString(address)) {
      throw new AccountsJsError(
        this.options.errors.invalidEmail,
        SendEnrollmentEmailErrors.InvalidEmail
      );
    }

    const user = await this.db.findUserByEmail(address);
    if (!user) {
      throw new AccountsJsError(
        this.options.errors.userNotFound,
        SendEnrollmentEmailErrors.UserNotFound
      );
    }
    const token = generateRandomToken();
    await this.db.addResetPasswordToken(
      user.id,
      address,
      token,
      'enroll',
      this.options.passwordEnrollTokenExpiration / 1000
    );

    const enrollmentMail = this.server.prepareMail(
      address,
      token,
      this.server.sanitizeUser(user),
      'enroll-account',
      this.server.options.emailTemplates.enrollAccount,
      this.server.options.emailTemplates.from
    );

    await this.server.options.sendMail(enrollmentMail);
  }

  /**
   * @description Create a new user.
   * @param user - The user object.
   * @returns Return the id of user created.
   * @throws {@link CreateUserErrors}
   */
  public async createUser(user: CreateUserServicePassword): Promise<string> {
    if (!user.username && !user.email) {
      throw new AccountsJsError(
        this.options.errors.usernameOrEmailRequired,
        CreateUserErrors.UsernameOrEmailRequired
      );
    }

    if (user.username && !this.options.validateUsername(user.username)) {
      throw new AccountsJsError(
        this.options.errors.invalidUsername,
        CreateUserErrors.InvalidUsername
      );
    }

    if (user.email && !this.options.validateEmail(user.email)) {
      throw new AccountsJsError(this.options.errors.invalidEmail, CreateUserErrors.InvalidEmail);
    }

    if (user.username && (await this.db.findUserByUsername(user.username))) {
      throw new AccountsJsError(
        this.options.errors.usernameAlreadyExists,
        CreateUserErrors.UsernameAlreadyExists
      );
    }

    if (user.email && (await this.db.findUserByEmail(user.email))) {
      throw new AccountsJsError(
        this.options.errors.emailAlreadyExists,
        CreateUserErrors.EmailAlreadyExists
      );
    }

    if (user.password) {
      if (!this.options.validatePassword(user.password)) {
        throw new AccountsJsError(
          this.options.errors.invalidPassword,
          CreateUserErrors.InvalidPassword
        );
      }
      user.password = await this.options.hashPassword(user.password);
    }

    user = await this.options.validateNewUser(user);

    try {
      const userId = await this.db.createUser(user);

      const userRecord = (await this.db.findUserById(userId)) as User;
      await this.server.getHooks().emit(ServerHooks.CreateUserSuccess, userRecord);

      if (this.options.sendVerificationEmailAfterSignup && user.email) {
        await this.sendVerificationEmail(user.email);
      }

      return userId;
    } catch (e) {
      await this.server.getHooks().emit(ServerHooks.CreateUserError, user);
      throw e;
    }
  }

  public isTokenExpired(tokenRecord: TokenRecord, expiryDate: number): boolean {
    return Number(tokenRecord.when) + expiryDate < Date.now();
  }

  private async passwordAuthenticator(
    user: string | LoginUserIdentity,
    password: string
  ): Promise<CustomUser> {
    const { username, email, id } = isString(user)
      ? this.toUsernameAndEmail({ user })
      : this.toUsernameAndEmail({ ...user });

    let foundUser: CustomUser | null = null;

    if (id) {
      // this._validateLoginWithField('id', user);
      foundUser = await this.db.findUserById(id);
    } else if (username) {
      // this._validateLoginWithField('username', user);
      foundUser = await this.db.findUserByUsername(username);
    } else if (email) {
      // this._validateLoginWithField('email', user);
      foundUser = await this.db.findUserByEmail(email);
    }

    if (!foundUser) {
      if (this.server.options.ambiguousErrorMessages) {
        throw new AccountsJsError(
          this.options.errors.invalidCredentials,
          PasswordAuthenticatorErrors.InvalidCredentials
        );
      } else {
        throw new AccountsJsError(
          this.options.errors.userNotFound,
          PasswordAuthenticatorErrors.UserNotFound
        );
      }
    }

    const hash = await this.db.findPasswordHash(foundUser.id);
    if (!hash) {
      throw new AccountsJsError(
        this.options.errors.noPasswordSet,
        PasswordAuthenticatorErrors.NoPasswordSet
      );
    }

    const isPasswordValid = await this.options.verifyPassword(password, hash);

    if (!isPasswordValid) {
      if (this.server.options.ambiguousErrorMessages) {
        throw new AccountsJsError(
          this.options.errors.invalidCredentials,
          PasswordAuthenticatorErrors.InvalidCredentials
        );
      } else {
        throw new AccountsJsError(
          this.options.errors.incorrectPassword,
          PasswordAuthenticatorErrors.IncorrectPassword
        );
      }
    }

    return foundUser;
  }

  /**
   * Given a username, user and/or email figure out the username and/or email.
   *
   * @param user An object containing at least `username`, `user` and/or `email`.
   * @returns An object containing `id`, `username` and `email`.
   */
  private toUsernameAndEmail({ user, username, email, id }: any): any {
    if (user && !username && !email) {
      if (isEmail(user)) {
        email = user;
        username = null;
      } else {
        username = user;
        email = null;
      }
    }
    return { username, email, id };
  }
}
