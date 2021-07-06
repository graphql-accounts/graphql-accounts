import { AccountsModule } from '@accounts/graphql-api';
import { AccountsPassword } from '@accounts/password';
import { GraphQLModule } from '@graphql-modules/core';
import { Inject, Module } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory, GraphQLModule as NestGQLModule } from '@nestjs/graphql';
import { ConfigModule } from 'nestjs-config';
import { resolve } from 'path';
// replace the below line with "import { AccountsJsModule } from '@nb/accountsjs-nest';"
import { AccountsJsModule, AccountsOptionsFactory, ACCOUNTS_JS_GRAPHQL, NestAccountsOptionsResult } from '../../';
import { UserDatabase } from '../shared/database.service';
import { DarthsResolver } from './DarthsResolver';
import { UserResolver } from './UserResolver';

class AppAccountsJSOptionsFactory implements AccountsOptionsFactory {
  constructor(@Inject(UserDatabase) private readonly userDatabase: UserDatabase) {}

  createAccountsOptions(): NestAccountsOptionsResult {
    return {
      serverOptions: {
        db: this.userDatabase,
        tokenSecret: 'secret',
      },
      services: {
        password: new AccountsPassword({
          validateUsername: v => !!v, // any username is fine as long as it's defined
        }),
      },
      GraphQL: true,
    };
  }
}

class AppGraphQLOptionsFactory implements GqlOptionsFactory {
  constructor(@Inject(ACCOUNTS_JS_GRAPHQL) private readonly accountsGQLModule: typeof AccountsModule) {}

  createGqlOptions(): GqlModuleOptions | Promise<GqlModuleOptions> {
    /**
     * Here we return the nest js/apollo server options. One of which is
     * Graphql modules. All we have to do is add this module and we're off to the races
     */
    return {
      playground: { endpoint: 'https://oss.code.nickbolles.com/server/graphql' },
      autoSchemaFile: '__schema.graphql',

      transformSchema: autoGenSchema => {
        return new GraphQLModule({
          extraSchemas: [autoGenSchema],
          imports: [this.accountsGQLModule],
        }).schemaAsync;
      },
    };
  }
}

const appAccountsModule = AccountsJsModule.registerAsync({
  providers: [UserDatabase],
  useClass: AppAccountsJSOptionsFactory,
});

@Module({
  providers: [UserDatabase, UserResolver, DarthsResolver],
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    appAccountsModule,
    /**
     * Now we need to build the graphql module
     */
    NestGQLModule.forRootAsync({ imports: [appAccountsModule], useClass: AppGraphQLOptionsFactory }),
  ],
})
export class AppModule {}
