import { createModule } from 'graphql-modules';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { User, ConnectionInformations } from '@accounts/types';
import { AccountsServer } from '@accounts/server';
import { IncomingMessage } from 'http';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import getSchemaDef from './schema/schema-def';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import makeSchema from './schema/schema';
//import { AuthenticatedDirective } from '../../utils/authenticated-directive';
//import { context } from '../../utils';

export interface AccountsRequest {
  req: IncomingMessage;
  connection?: any;
}

export interface AccountsCoreModuleConfig {
  accountsServer: AccountsServer;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  //headerName?: string;
  userAsInterface?: boolean;
  //excludeAddUserInContext?: boolean;
}

export interface AccountsContext<IUser = User> {
  authToken?: string;
  user?: IUser;
  userId?: string;
  userAgent: string | null;
  ip: string | null;
  infos: ConnectionInformations;
}

export type AccountsContextGraphQLModules<IUser = User> = AccountsContext<IUser> &
  GraphQLModules.ModuleContext;

export const createAccountsCoreModule = (config: AccountsCoreModuleConfig) =>
  createModule({
    id: 'accounts-core',
    typeDefs: mergeTypeDefs(
      [
        makeSchema(config),
        TypesTypeDefs,
        getQueryTypeDefs(config),
        getMutationTypeDefs(config),
        ...getSchemaDef(config),
      ],
      {
        useSchemaDefinition: config.withSchemaDefinition,
      }
    ),
    resolvers: {
      [config.rootQueryName || 'Query']: Query,
      [config.rootMutationName || 'Mutation']: Mutation,
    },
    providers: [
      {
        provide: AccountsServer,
        useValue: config.accountsServer,
        global: true,
      },
      // AccountsPassword
    ],
    //context: context('accounts'),
    //schemaDirectives: {
    //  auth: AuthenticatedDirective,
    //},
  });
