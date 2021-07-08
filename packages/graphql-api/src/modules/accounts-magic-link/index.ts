import { AccountsServer } from '@accounts/server';
import { AccountsPassword } from '@accounts/password';
import { AccountsMagicLink } from '@accounts/magic-link';
import { GraphQLModule } from '@graphql-modules/core';
import { AccountsRequest } from '../accounts';
import getMutationTypeDefs from './schema/mutation';
import { Mutation } from './resolvers/mutation';
import { CoreAccountsModule } from '../core';
import { context } from '../../utils';

export interface AccountsMagicLinkModuleConfig {
  accountsServer: AccountsServer;
  accountsPassword: AccountsPassword;
  accountsMagicLink: AccountsMagicLink;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
}

export const AccountsMagicLinkModule: GraphQLModule<
  AccountsMagicLinkModuleConfig,
  AccountsRequest
> = new GraphQLModule<AccountsMagicLinkModuleConfig, AccountsRequest>({
  name: 'accounts-magic-link',
  typeDefs: ({ config }) => [getMutationTypeDefs(config)],
  resolvers: ({ config }) =>
    ({
      [config.rootMutationName || 'Mutation']: Mutation,
    } as any),
  imports: ({ config }) => [
    CoreAccountsModule.forRoot({
      userAsInterface: config.userAsInterface,
    }),
  ],
  providers: ({ config }) => [
    {
      provide: AccountsServer,
      useValue: config.accountsServer,
    },
    {
      provide: AccountsPassword,
      useValue: config.accountsPassword,
    },
    {
      provide: AccountsMagicLink,
      useValue: config.accountsMagicLink,
    },
  ],
  context: context('accounts-magic-link'),
  configRequired: true,
});
