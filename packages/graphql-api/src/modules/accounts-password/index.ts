import { GraphQLModule } from '@graphql-modules/core';
import { AccountsPassword } from '@accounts/password';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { AccountsRequest } from '../accounts';
import { context } from '../../utils';
import { CoreAccountsModule } from '../core';
import { ProviderScope } from '@graphql-modules/di';

export interface AccountsPasswordModuleConfig {
  ctorParams: ConstructorParameters<typeof AccountsPassword>;
  scope?: ProviderScope;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
}

export const AccountsPasswordModule: GraphQLModule<
  AccountsPasswordModuleConfig,
  AccountsRequest
> = new GraphQLModule<AccountsPasswordModuleConfig, AccountsRequest>({
  name: 'accounts-password',
  typeDefs: ({ config }) => [TypesTypeDefs, getQueryTypeDefs(config), getMutationTypeDefs(config)],
  resolvers: ({ config }) =>
    ({
      [config.rootQueryName || 'Query']: Query,
      [config.rootMutationName || 'Mutation']: Mutation,
    } as any),
  imports: [CoreAccountsModule],
  context: context('accounts-password'),
  configRequired: true,
});
