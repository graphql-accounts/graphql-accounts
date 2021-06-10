import { createApplication } from 'graphql-modules';
import {
  AccountsCoreModuleConfig,
  AccountsPasswordModuleConfig,
  createAccountsCoreModule,
  createAccountsPasswordModule,
} from './modules';

const { schema } = createApplication({
  modules: [
    createAccountsCoreModule({} as AccountsCoreModuleConfig),
    createAccountsPasswordModule({} as AccountsPasswordModuleConfig),
  ],
});

export default schema;
