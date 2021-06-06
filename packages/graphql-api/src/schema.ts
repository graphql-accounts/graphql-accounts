/**
 * This file is used to export the schema so graphql-codegen can generate the proper types.
 * Do not import directly in your application.
 */
import { createApplication } from 'graphql-modules';
import { CoreModule, CoreModuleConfig, PasswordModule } from './modules';

const accountsServer = {
  getServices: () => ({
    password: {},
  }),
};

const config = <CoreModuleConfig>{
  accountsServer: accountsServer as any,
};

const application = createApplication({
  modules: [CoreModule(config), PasswordModule(config)],
});

export default application.schema;
