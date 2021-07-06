import { AccountsPassword } from '@accounts/password';
import { Module } from '@nestjs/common';
import { AccountsJsModule } from '../../lib';
import { UserDatabase } from '../shared/database.service';

@Module({
  imports: [
    AccountsJsModule.register({
      serverOptions: {
        db: new UserDatabase(),
        tokenSecret: 'secret',
      },
      services: {
        password: new AccountsPassword(),
      },
      // With no options you can just use true
      // REST: true,
      REST: {
        path: '/',
        transformOAuthResponse: loginResult => loginResult,
        onOAuthError: (req, res, err) => console.log('Oauth Error'),
        onOAuthSuccess: (req, res, err) => console.log('Oauth Success'),
      },
      /**
       * tip: The above is a shortcut for the custom provider and is equal to the following.
       *
       * accountsOptions: {
       *    provide: ACCOUNTS_JS_OPTIONS,
       *    useValue: {
       *      serverOptions: {
       *        db: new UserDatabase(),
       *        tokenSecret: "secret"
       *      },
       *      services: {
       *        password: new AccountsPassword()
       *      }
       *    }
       * }
       */
    }),
  ],
})
export class AppModule {}
