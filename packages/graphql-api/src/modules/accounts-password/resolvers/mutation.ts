import { ModuleContext } from '@graphql-modules/core';
import { AccountsPassword, PasswordCreateUserType } from '@accounts/password';
import { AccountsServer } from '@accounts/server';
import { AccountsContext } from '../../../utils/context-builder';
import { MutationResolvers } from '../../../models';

export const Mutation: MutationResolvers<ModuleContext<AccountsContext>> = {
  changePassword: async (_, { oldPassword, newPassword }, { user, injector }) => {
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;
    await injector.get(AccountsPassword).changePassword(userId, oldPassword, newPassword);
    return null;
  },
  createUser: async (_, { user }, { injector }) => {
    const userId = await injector.get(AccountsPassword).createUser(user as PasswordCreateUserType);
    return injector.get(AccountsServer).options.ambiguousErrorMessages ? null : userId;
  },
  twoFactorSet: async (_, { code, secret }, { user, injector }) => {
    // Make sure user is logged in
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    await injector.get(AccountsPassword).twoFactor.set(userId, secret as any, code);
    return null;
  },
  twoFactorUnset: async (_, { code }, { user, injector }) => {
    // Make sure user is logged in
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    await injector.get(AccountsPassword).twoFactor.unset(userId, code);
    return null;
  },
  resetPassword: async (_, { token, newPassword }, { injector, ip, userAgent }) => {
    return injector.get(AccountsPassword).resetPassword(token, newPassword, { ip, userAgent });
  },
  sendResetPasswordEmail: async (_, { email }, { injector }) => {
    await injector.get(AccountsPassword).sendResetPasswordEmail(email);
    return null;
  },
  verifyEmail: async (_, { token }, { injector }) => {
    await injector.get(AccountsPassword).verifyEmail(token);
    return null;
  },
  sendVerificationEmail: async (_, { email }, { injector }) => {
    await injector.get(AccountsPassword).sendVerificationEmail(email);
    return null;
  },
};
