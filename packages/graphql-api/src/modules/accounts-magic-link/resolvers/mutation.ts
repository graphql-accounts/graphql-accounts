import { ModuleContext } from '@graphql-modules/core';
import { AccountsMagicLink, RequestMagicLinkEmailErrors } from '@accounts/magic-link';
import { AccountsServer, AccountsJsError } from '@accounts/server';
import { AccountsModuleContext } from '../../accounts';
import { MutationResolvers } from '../../../models';

export const Mutation: MutationResolvers<ModuleContext<AccountsModuleContext>> = {
  requestMagicLinkEmail: async (_, { email }, { injector }) => {
    const accountsServer = injector.get(AccountsServer);
    const accountsMagicLink = injector.get(AccountsMagicLink);

    try {
      await accountsMagicLink.requestMagicLinkEmail(email);
    } catch (error) {
      // If ambiguousErrorMessages is true,
      // to prevent user enumeration we fail silently in case there is no user attached to this email
      if (
        accountsServer.options.ambiguousErrorMessages &&
        error instanceof AccountsJsError &&
        error.code === RequestMagicLinkEmailErrors.UserNotFound
      ) {
        return null;
      }
      throw error;
    }

    return null;
  },
};
