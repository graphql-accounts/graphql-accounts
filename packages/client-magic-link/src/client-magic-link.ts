import { AccountsClient } from '@accounts/client';
import { LoginResult, LoginUserMagicLinkService } from '@accounts/types';

export class AccountsClientMagicLink {
  private client: AccountsClient;

  constructor(client: AccountsClient) {
    if (!client) {
      throw new Error('A valid client instance is required');
    }
    this.client = client;
  }

  /**
   * Log the user in with a token.
   */
  public async login(user: LoginUserMagicLinkService): Promise<LoginResult> {
    return this.client.loginWithService('magic-link', user);
  }

  /**
   * Request a new login link.
   * @param {string} email - The email address to send a login link.
   */
  public requestMagicLinkEmail(email: string): Promise<void> {
    return this.client.transport.requestMagicLinkEmail(email);
  }
}
