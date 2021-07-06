import { AccountsPassword } from '@accounts/password';
import { Inject, Module } from '@nestjs/common';
import { RouterModule } from 'nest-router';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { resolve } from 'path';
import { AccountsJsModule, AccountsOptionsFactory, NestAccountsOptionsResult } from '../../lib';
import { UserDatabase } from '../shared/database.service';
// tslint:disable:max-line-length

export class AppAccountsOptionsFactory implements AccountsOptionsFactory {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}
  createAccountsOptions(): NestAccountsOptionsResult {
    return {
      serverOptions: {
        db: new UserDatabase(),
        tokenSecret: this.configService.get('auth.tokenSecret'),
      },
      services: {
        password: new AccountsPassword(),
      },
      REST: {
        /**
         * With nest-router this path becomes relative to the route that is setup by nest router
         *
         * Internally nest-router sets the MODULE_PATH metadata on the module. This path will be
         * appended to the MODULE_PATH path, unless relative is set to false.
         *
         * If there is a MODULE_PATH, the default changes a bit, if there is no path passed in the MODULE_PATH is used
         * (/accounts is not appended like it is if there isn't a MODULE_PATH). if there is a path it's appended to the MODULE_PATH.
         *
         * If there is not a MODULE_PATH, or relative = false, it behaves the same as normal. The Path is absolute to the server's root
         *
         */
        //path: '/myroute', // route examples: /auth/myroute/user, /auth/myroute/:service/authenticate, /auth/myroute/password/register etc.
        // path: "", // DEFAULT - route examples: /auth/user, /auth/:service/authenticate, /auth/password/register etc.
        // path: "/myroute", relative: false // examples: /myroute/user,  /myroute/:service/authenticate, /myroute/password/register etc.
        // relative: false // examples: /accounts/user,  /accounts/:service/authenticate, /accounts/password/register etc.

        path: this.configService.get('auth.path'),
        ignoreNestRoute: this.configService.get('auth.ignoreNestRoute'),
      },
    };
  }
}

/**
 * Define the routes for the app
 */
const routes = [
  {
    path: '/app',
    children: [{ path: '/auth', module: AccountsJsModule }],
  },
];

@Module({
  imports: [
    /**
     * Mount the router module for the configured routes
     */
    RouterModule.forRoutes(routes),
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')), // mostly just for testing and injecting the path settings
    AccountsJsModule.registerAsync({ useClass: AppAccountsOptionsFactory }),
  ],
})
export class AppModule {}
