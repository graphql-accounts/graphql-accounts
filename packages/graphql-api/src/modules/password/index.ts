import { createModule } from 'graphql-modules';
import { AccountsPassword } from '@accounts/password';
import getTypesTypeDef from './schema/types';
import getQueryTypeDef from './schema/query';
import getMutationTypeDef from './schema/mutation';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { CoreModuleConfig } from '../core';

export const PasswordModule = (config: CoreModuleConfig) =>
  createModule({
    id: 'accounts-password',
    dirname: __dirname,
    typeDefs: [getTypesTypeDef, getQueryTypeDef(config), getMutationTypeDef(config)],
    resolvers: [
      {
        [config.rootQueryName || 'Query']: Query,
        [config.rootMutationName || 'Mutation']: Mutation,
      },
    ],
    providers: [
      {
        provide: AccountsPassword,
        useValue: <AccountsPassword>config.accountsServer.getServices().password,
      },
    ],
  });
