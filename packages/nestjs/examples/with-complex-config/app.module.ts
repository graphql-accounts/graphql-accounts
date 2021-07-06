import { AccountsPassword } from '@accounts/password';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { resolve } from 'path';
import { AccountsJsModule } from '../../lib';
import { UserDatabase } from '../shared/database.service';

@Module({
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    AccountsJsModule.registerAsync({
      /**
       * The accountsOptions is treated as a nest Custom Provider. This means that we can do some pretty
       * powerful stuff when we take advantage of Nests dependency injection, including seemless configuration
       * with @nextjs/config
       *
       * WARNING: Anything injected into the factory MUST be available to the AccountsJsModule as a provider.
       *          In other words, make sure you add it to the providers array in the AccountsJsModule register options.
       *
       * Note: ussually using a class for configuratino is much cleaner than a factory
       */

      // provide: ACCOUNTS_JS_OPTIONS // This is defaulted in by the module
      useFactory: (userDatabase: UserDatabase, configService: ConfigService) => {
        return {
          serverOptions: {
            db: userDatabase,
            tokenSecret: configService.get('auth.tokenSecret'),
          },
          services: {
            password: new AccountsPassword(),
          },
          REST: {
            path: configService.get('auth.path'),
            ignoreNestRoute: configService.get('auth.ignoreNestRoute'),
          },
        };
      },
      /**
       * This is where we can inject anything from nest. This array will be passed in in this order to useFactory
       */
      inject: [UserDatabase, ConfigService],

      /**
       * This is where we have to define anything that we are injecting into the useFactory function
       */
      providers: [UserDatabase, ConfigService],
      // ...Any other standard Nest.js module properties that might be needed (imports, controllers etc)
    }),
  ],
})
export class AppModule {}
