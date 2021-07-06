import { AccountsPassword } from '@accounts/password';
import { Inject, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { resolve } from 'path';
import { AccountsJsModule, AccountsOptionsFactory, NestAccountsOptionsResult } from '../../lib';
import { UserDatabase } from '../shared/database.service';
import { UserService } from './UserService';

class AppAccountsOptionsFactory implements AccountsOptionsFactory {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(UserDatabase) private readonly userDatabase: UserDatabase,
  ) {}
  createAccountsOptions(): NestAccountsOptionsResult {
    return {
      serverOptions: {
        db: this.userDatabase,
        tokenSecret: this.configService.get('auth.tokenSecret'),
      },
      services: {
        password: new AccountsPassword(),
      },
      REST: {
        path: this.configService.get('auth.path'),
      },
    };
  }
}

@Module({
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    AccountsJsModule.registerAsync({
      providers: [UserDatabase],
      /**
       * The accountsOptions is treated as a nest Custom Provider. This means that we can do some pretty
       * powerful stuff when we take advantage of Nests dependency injection, including seemless configuration
       * with @nextjs/config
       *
       * WARNING: Anything injected into the factory MUST be available to the AccountsJsModule as a provider.
       *          In other words, make sure you add it to the providers array in the AccountsJsModule register options.
       */
      useClass: AppAccountsOptionsFactory,
    }),
  ],
  providers: [UserDatabase, UserService, ConfigService],
})
export class AppModule {}
