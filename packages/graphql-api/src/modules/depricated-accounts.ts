import { CoreModule, CoreModuleConfig } from './core';
import { createApplication } from 'graphql-modules';
import { PasswordModule } from './password';

export class AccountsModule {
  static forRoot(config: CoreModuleConfig) {
    return createApplication({
      modules: [CoreModule(config), ...this.includePasswordModule(config)],
    });
  }

  private static includePasswordModule(config: CoreModuleConfig) {
    return config.accountsServer.getServices().password ? [PasswordModule(config)] : [];
  }
}
