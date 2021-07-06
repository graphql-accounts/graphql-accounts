import { ModuleMetadata } from '@nestjs/common/interfaces';
import { AsyncNestAccountsOptions } from '../interfaces/AccountsNestModuleOptions';

export function extractModuleMetadata(options: AsyncNestAccountsOptions): ModuleMetadata {
  const { controllers, exports, imports, providers } = options;
  return {
    controllers,
    exports,
    imports,
    providers,
  };
}
