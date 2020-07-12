import { QueryResolvers } from '../../../models';
import { ModuleContext } from '@graphql-modules/core';
import { AccountsModuleContext } from '../../accounts';
import { AccountsPassword } from '@accounts/password';
import { AuthenticationServices } from '@accounts/server';

export const Query: QueryResolvers<ModuleContext<AccountsModuleContext>> = {
  twoFactorSecret: async (_, args, ctx) => {
    const { user, injector } = ctx;

    // Make sure user is logged in
    if (!(user && user.id)) {
      throw new Error('Unauthorized');
    }

    // https://github.com/speakeasyjs/speakeasy/blob/master/index.js#L517
    const secret = (injector.get(AuthenticationServices)
      .password as AccountsPassword).twoFactor.getNewAuthSecret();
    return secret;
  },
};
