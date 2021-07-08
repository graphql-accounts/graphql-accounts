import { GraphQLModule } from '@graphql-modules/core';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { User, ConnectionInformations } from '@accounts/types';
import { AccountsServer } from '@accounts/server';
import AccountsPassword from '@accounts/password';
import AccountsMagicLink from '@accounts/magic-link';
import { IncomingMessage } from 'http';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import getSchemaDef from './schema/schema-def';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { User as UserResolvers } from './resolvers/user';
import { AccountsPasswordModule } from '../accounts-password';
import { AccountsMagicLinkModule } from '../accounts-magic-link';
import { AuthenticatedDirective } from '../../utils/authenticated-directive';
import { context } from '../../utils';
import { CoreAccountsModule } from '../core';

export interface AccountsRequest {
  req: IncomingMessage;
  connection?: any;
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

export interface AccountsModuleContext<IUser = User> {
  authToken?: string;
  user?: IUser;
  userId?: string;
  userAgent: string | null;
  ip: string | null;
  infos: ConnectionInformations;
}

// You can see the below. It is really easy to create a reusable GraphQL-Module with different configurations

export const AccountsModule: GraphQLModule<
  AccountsModuleConfig,
  AccountsRequest,
  AccountsModuleContext
> = new GraphQLModule<AccountsModuleConfig, AccountsRequest, AccountsModuleContext>({
  name: 'accounts',
  typeDefs: ({ config }) =>
    mergeTypeDefs(
      [
        TypesTypeDefs,
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
    } as any),
  // If necessary, import AccountsPasswordModule together with this module
  imports: ({ config }) => [
    CoreAccountsModule.forRoot({
      userAsInterface: config.userAsInterface,
    }),
    ...(config.accountsServer.getServices().password
      ? [
          AccountsPasswordModule.forRoot({
            accountsPassword: config.accountsServer.getServices().password as AccountsPassword,
            ...config,
          }),
        ]
      : []),
    ...(config.accountsServer.getServices().magicLink
      ? [
          AccountsMagicLinkModule.forRoot({
            accountsPassword: config.accountsServer.getServices().password as AccountsPassword,
            accountsMagicLink: config.accountsServer.getServices().magicLink as AccountsMagicLink,
            ...config,
          }),
        ]
      : []),
  ],
  providers: ({ config }) => [
    {
      provide: AccountsServer,
      useValue: config.accountsServer,
    },
  ],
  context: context('accounts'),
  schemaDirectives: {
    auth: AuthenticatedDirective,
  },
  configRequired: true,
});
