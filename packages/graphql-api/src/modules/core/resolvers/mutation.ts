import { AccountsServer } from '@accounts/server';
import { MutationResolvers } from '../../../models';

export const Mutation: MutationResolvers<GraphQLModules.Context> = {
  authenticate: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { injector, infos } = ctx;

    const authenticated = await injector
      .get(AccountsServer)
      .loginWithService(serviceName, params, infos);
    return authenticated;
  },
  verifyAuthentication: async (_, args, ctx) => {
    const { serviceName, params } = args;
    const { injector, infos } = ctx;

    const authenticated = await injector
      .get(AccountsServer)
      .authenticateWithService(serviceName, params, infos);
    return authenticated;
  },
  impersonate: async (_, args, ctx) => {
    const { accessToken, impersonated } = args;
    const { injector, infos } = ctx;

    const impersonateRes = await injector.get(AccountsServer).impersonate(
      accessToken,
      {
        userId: impersonated.userId!,
        username: impersonated.username!,
        email: impersonated.email!,
      },
      infos
    );

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
    const { injector, infos } = ctx;

    const refreshedSession = await injector
      .get(AccountsServer)
      .refreshTokens(accessToken, refreshToken, infos);

    return refreshedSession;
  },
};
