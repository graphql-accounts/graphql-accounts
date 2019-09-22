import { TokenStorage } from '.';

export interface AccountsClientOptions {
  /**
   * Storage that accounts-js will use to store the tokens.
   * Default: 'localStorage'.
   */
  tokenStorage?: TokenStorage;

  /**
   * Token that will prefix the storage key.
   * Default: 'accounts'.
   */
  tokenStoragePrefix?: string;
}
