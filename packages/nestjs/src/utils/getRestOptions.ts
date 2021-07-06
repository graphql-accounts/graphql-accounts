import { isBoolean } from 'util';
import { NestAccountsExpressOptions, NestAccountsOptions } from '../interfaces/AccountsNestModuleOptions';

export function getRESTOptions(options: NestAccountsOptions): NestAccountsExpressOptions {
  return isBoolean(options.REST) ? {} : options.REST || {};
}
