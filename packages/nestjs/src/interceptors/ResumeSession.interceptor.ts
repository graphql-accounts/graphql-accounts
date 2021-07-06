import AccountsServer from '@accounts/server';
import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ACCOUNTS_JS_SERVER } from '../utils/accounts.constants';
import { getAccessToken } from '../utils/getAccessToken';

// tslint:disable:max-line-length
/**
 * Interceptor to resume the Accounts.js session
 *
 * This is essentially a copy of the [user loader middleware](https://github.com/accounts-js/accounts/blob/master/packages/rest-express/src/user-loader.ts)
 * from rest-express, but in the form of an interceptor
 * for use throughout your Nest App
 */
// tslint:enable:max-line-length

@Injectable()
export class AccountsSessionInterceptor implements NestInterceptor {
  constructor(@Inject(ACCOUNTS_JS_SERVER) private readonly accountsServer: AccountsServer) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const accessToken = getAccessToken(req);

    if (accessToken) {
      try {
        req.authToken = accessToken;
        const user = await this.accountsServer.resumeSession(accessToken);
        req.user = user;
        req.userId = user.id;
        // tslint:disable-next-line:no-empty
      } catch (e) {}
    }

    return next.handle();
  }
}

/**
 * A custom provider to use for the module
 */
export const AccountsSessionInterceptorProvider = {
  provide: APP_INTERCEPTOR,
  useClass: AccountsSessionInterceptor,
};
