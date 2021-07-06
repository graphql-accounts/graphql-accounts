import { AccountsPassword } from '@accounts/password';
import { Inject, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { resolve } from 'path';
import { AccountsJsModule, AccountsOptionsFactory, NestAccountsOptionsResult } from '../../lib';
import { UserDatabase } from '../shared/database.service';

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
        ignoreNestRoute: this.configService.get('auth.ignoreNestRoute'),
      },
    };
  }
}

@Module({
  imports: [ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}'))],
  exports: [ConfigModule],
})
class AppConfigModule {}

const UserDatabaseProvider = { provide: UserDatabase, useClass: UserDatabase };
@Module({
  providers: [UserDatabaseProvider],
  exports: [UserDatabaseProvider],
})
class UsersModule {}

@Module({
  imports: [
    AppConfigModule,
    UsersModule,
    AccountsJsModule.registerAsync({
      imports: [UsersModule], // Must import any non-global modules into the AccountsJsModule
      /**
       * The accountsOptions is treated as a nest Custom Provider. This means that we can do some pretty
       * powerful stuff when we take advantage of Nests dependency injection, including seamless configuration
       * with @nextjs/config
       *
       * WARNING: Anything injected into the factory MUST be available to the AccountsJsModule as a provider.
       *          In other words, make sure you add the module to the imports array in the AccountsJsModule register options.
       */
      useClass: AppAccountsOptionsFactory,
    }),
  ],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.listen(3000);
}
bootstrap();
