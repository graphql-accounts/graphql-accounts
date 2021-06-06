import { createModule } from 'graphql-modules';
import { AccountsServer } from '@accounts/server';
import { User, ConnectionInformations } from '@accounts/types';
import getTypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import getSchemaDef from './schema/schema-def';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';

declare global {
  namespace GraphQLModules {
    interface GlobalContext {
      authToken?: string;
      user?: User;
      userId?: string;
      userAgent: string | null;
      ip: string | null;
      infos: ConnectionInformations;
    }
  }
}

export interface CoreModuleConfig {
  accountsServer: AccountsServer;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
}

export const CoreModule = (config: CoreModuleConfig) =>
  createModule({
    id: 'accounts-core',
    dirname: __dirname,
    typeDefs: [
      getTypesTypeDefs(config),
      getQueryTypeDefs(config),
      getMutationTypeDefs(config),
      ...getSchemaDef(config),
    ],
    resolvers: [
      {
        [config.rootQueryName || 'Query']: Query,
        [config.rootMutationName || 'Mutation']: Mutation,
      },
    ],
    providers: [
      {
        provide: AccountsServer,
        useValue: config.accountsServer,
        global: true,
      },
    ],
  });
