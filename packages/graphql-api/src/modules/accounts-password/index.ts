import { GraphQLModule } from '@graphql-modules/core';
import { AccountsPassword } from '@accounts/password';
import { AccountsServer } from '@accounts/server';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { AccountsRequest } from '../accounts';
import { context, RequestExtractor } from '../../utils';

export interface AccountsPasswordModuleConfig {
  accountsServer: AccountsServer;
  accountsPassword: AccountsPassword;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
}

export function accountsPasswordModuleFactory<T extends object = AccountsRequest>(
  requestExtractor?: RequestExtractor<T>
) {
  return new GraphQLModule<AccountsPasswordModuleConfig, T>({
    name: 'accounts-password',
    typeDefs: ({ config }) => [
      TypesTypeDefs,
      getQueryTypeDefs(config),
      getMutationTypeDefs(config),
    ],
    resolvers: ({ config }) =>
      ({
        [config.rootQueryName || 'Query']: Query,
        [config.rootMutationName || 'Mutation']: Mutation,
      } as any),
    providers: ({ config }) => [
      {
        provide: AccountsServer,
        useValue: config.accountsServer,
      },
      {
        provide: AccountsPassword,
        useValue: config.accountsPassword,
      },
    ],
    context: context('accounts-password', requestExtractor),
    configRequired: true,
  });
}

export const AccountsPasswordModule = accountsPasswordModuleFactory();
