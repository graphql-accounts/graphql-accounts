import { MutationResolvers } from '../../../models';
import { ModuleContext } from '@graphql-modules/core';
import { AccountsContext } from '../../../utils/context-builder';
import { AccountsServer } from '@accounts/server';

export const Mutation: MutationResolvers<ModuleContext<AccountsContext>> = {
  authenticate: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { ip, userAgent, injector } = ctx;

    const authenticated = await injector.get(AccountsServer).loginWithService(serviceName, params, {
      ip,
      userAgent,
    });
    return authenticated;
  },
  verifyAuthentication: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { ip, userAgent, injector } = ctx;

    const authenticated = await injector
      .get(AccountsServer)
      .authenticateWithService(serviceName, params, {
        ip,
        userAgent,
      });
    return authenticated;
  },
  impersonate: async (_, args, ctx) => {
    const { accessToken, username } = args;
    const { ip, userAgent, injector } = ctx;

    const impersonateRes = await injector
      .get(AccountsServer)
      .impersonate(accessToken, { username }, ip, userAgent);

    // So ctx.user can be used in subsequent queries / mutations
    if (impersonateRes && impersonateRes.user && impersonateRes.tokens) {
      ctx.user = impersonateRes.user;
      ctx.authToken = impersonateRes.tokens.accessToken;
    }

    return impersonateRes;
  },
  logout: async (_, __, context) => {
    const { authToken, injector } = context;

    if (authToken) {
      await injector.get(AccountsServer).logout(authToken);
    }

    return null;
  },
  refreshTokens: async (_, args, ctx) => {
    const { accessToken, refreshToken } = args;
    const { ip, userAgent, injector } = ctx;

    const refreshedSession = await injector
      .get(AccountsServer)
      .refreshTokens(accessToken, refreshToken, ip, userAgent);

    return refreshedSession;
  },
};
