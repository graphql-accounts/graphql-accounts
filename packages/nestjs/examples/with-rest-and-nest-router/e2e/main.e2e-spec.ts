import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config';
import { resolve } from 'path';
import { AccountsJsModule } from '../../../lib';
import { RouteTestTableWithRouter } from '../../shared/routes';
import { sharedRoutesTests } from '../../shared/sharedRouteTests';
import { AppAccountsOptionsFactory } from '../app.module';

// It looks like nest-router can only be setup once, if we have multiple entries in
// imports it doesnt work, so lets setup a test module
@Module({
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')), // mostly just for testing and injecting the path settings
    AccountsJsModule.registerAsync({ useClass: AppAccountsOptionsFactory }),
  ],
})
class AppModule {}

describe('with-rest-and-nest-router', () => {
  describe('REST', () =>
    sharedRoutesTests(AppModule, RouteTestTableWithRouter('/app/auth'), {
      password: true,
    }));
});
