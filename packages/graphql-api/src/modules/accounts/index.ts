import { GraphQLModule } from '@graphql-modules/core';
import { AccountsServer } from '@accounts/server';
import { IncomingMessage } from 'http';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import getSchemaDef from './schema/schema-def';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { User as UserResolvers } from './resolvers/user';
import { LoginResult as LoginResultResolvers } from './resolvers/loginResult';
import { accountsPasswordModuleFactory } from '../accounts-password';
import { AuthenticatedDirective } from '../../utils/authenticated-directive';
import { context, RequestExtractor } from '../../utils';
import AccountsPassword from '@accounts/password';
import { mergeTypeDefs } from 'graphql-toolkit';

export interface AccountsRequest {
  req: IncomingMessage;
}

export interface AccountsModuleConfig {
  accountsServer: AccountsServer;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
}

export function accountsModuleFactory<T extends object = AccountsRequest>(
  requestExtractor?: RequestExtractor<T>
) {
  return new GraphQLModule<AccountsModuleConfig, T>({
    name: 'accounts',
    typeDefs: ({ config }) =>
      mergeTypeDefs(
        [
          TypesTypeDefs(config),
          getQueryTypeDefs(config),
          getMutationTypeDefs(config),
          ...getSchemaDef(config),
        ],
        {
          useSchemaDefinition: config.withSchemaDefinition,
        }
      ),
    resolvers: ({ config }) =>
      ({
        [config.rootQueryName || 'Query']: Query,
        [config.rootMutationName || 'Mutation']: Mutation,
        User: UserResolvers,
        LoginResult: LoginResultResolvers,
      } as any),
    // If necessary, import AccountsPasswordModule together with this module
    imports: ({ config }) =>
      config.accountsServer.getServices().password
        ? [
            accountsPasswordModuleFactory(requestExtractor).forRoot({
              accountsPassword: config.accountsServer.getServices().password as AccountsPassword,
              ...config,
            }),
          ]
        : [],
    providers: ({ config }) => [
      {
        provide: AccountsServer,
        useValue: config.accountsServer,
      },
    ],
    context: context('accounts', requestExtractor),
    schemaDirectives: {
      auth: AuthenticatedDirective,
    },
    configRequired: true,
  });
}

export const AccountsModule = accountsModuleFactory();
