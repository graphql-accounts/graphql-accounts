import { createModule } from 'graphql-modules';
import { AccountsPassword } from '@accounts/password';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';

export interface AccountsPasswordModuleConfig {
  accountsPassword: AccountsPassword;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  //withSchemaDefinition?: boolean;
  //headerName?: string;
  //userAsInterface?: boolean;
  //excludeAddUserInContext?: boolean;
}

export const createAccountsPasswordModule = (config: AccountsPasswordModuleConfig) =>
  createModule({
    id: 'accounts-password',
    typeDefs: [TypesTypeDefs, getQueryTypeDefs(config), getMutationTypeDefs(config)],
    resolvers: {
      [config.rootQueryName || 'Query']: Query,
      [config.rootMutationName || 'Mutation']: Mutation,
    },
    providers: [
      {
        provide: AccountsPassword,
        useValue: config.accountsPassword,
      },
    ],
    //context: context('accounts-password'),
  });
