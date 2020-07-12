import { ModuleContext } from '@graphql-modules/core';
import { CreateUserServicePassword } from '@accounts/types';
import { AccountsPassword, CreateUserErrors } from '@accounts/password';
import { AccountsServer, AccountsJsError, AuthenticationServices } from '@accounts/server';
import { AccountsModuleContext } from '../../accounts';
import { MutationResolvers } from '../../../models';

export const Mutation: MutationResolvers<ModuleContext<AccountsModuleContext>> = {
  addEmail: async (_, { newEmail }, { user, injector }) => {
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    await (injector.get(AuthenticationServices).password as AccountsPassword).addEmail(
      userId,
      newEmail
    );
    return null;
  },
  changePassword: async (_, { oldPassword, newPassword }, { user, injector }) => {
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    await (injector.get(AuthenticationServices).password as AccountsPassword).changePassword(
      userId,
      oldPassword,
      newPassword
    );
    return null;
  },
  createUser: async (_, { user }, ctx) => {
    const { injector, infos } = ctx;
    const accountsServer = injector.get(AccountsServer);
    const accountsPassword = injector.get(AuthenticationServices).password as AccountsPassword;

    let userId: string;

    try {
      userId = await accountsPassword.createUser(user as CreateUserServicePassword);
    } catch (error) {
      // If ambiguousErrorMessages is true we obfuscate the email or username already exist error
      // to prevent user enumeration during user creation
      if (
        accountsServer.options.ambiguousErrorMessages &&
        error instanceof AccountsJsError &&
        (error.code === CreateUserErrors.EmailAlreadyExists ||
          error.code === CreateUserErrors.UsernameAlreadyExists)
      ) {
        return {};
      }
      throw error;
    }

    if (!accountsServer.options.enableAutologin) {
      return {
        userId: accountsServer.options.ambiguousErrorMessages ? null : userId,
      };
    }

    // When initializing AccountsServer we check that enableAutologin and ambiguousErrorMessages options
    // are not enabled at the same time

    const createdUser = await accountsServer.findUserById(userId);

    // If we are here - user must be created successfully
    // Explicitly saying this to Typescript compiler
    const loginResult = await accountsServer.loginWithUser(createdUser!, infos);

    return {
      userId,
      loginResult,
    };
  },
  twoFactorSet: async (_, { code, secret }, { user, injector }) => {
    // Make sure user is logged in
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    await (injector.get(AuthenticationServices).password as AccountsPassword).twoFactor.set(
      userId,
      secret as any,
      code
    );
    return null;
  },
  twoFactorUnset: async (_, { code }, { user, injector }) => {
    // Make sure user is logged in
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    await (injector.get(AuthenticationServices).password as AccountsPassword).twoFactor.unset(
      userId,
      code
    );
    return null;
  },
  resetPassword: async (_, { token, newPassword }, { injector, infos }) => {
    return (injector.get(AuthenticationServices).password as AccountsPassword).resetPassword(
      token,
      newPassword,
      infos
    );
  },
  sendResetPasswordEmail: async (_, { email }, { injector }) => {
    await (injector.get(AuthenticationServices)
      .password as AccountsPassword).sendResetPasswordEmail(email);
    return null;
  },
  verifyEmail: async (_, { token }, { injector }) => {
    await (injector.get(AuthenticationServices).password as AccountsPassword).verifyEmail(token);
    return null;
  },
  sendVerificationEmail: async (_, { email }, { injector }) => {
    await (injector.get(AuthenticationServices).password as AccountsPassword).sendVerificationEmail(
      email
    );
    return null;
  },
};
