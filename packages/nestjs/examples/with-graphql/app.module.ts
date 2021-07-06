import { AccountsModule } from '@accounts/graphql-api';
import { AccountsPassword } from '@accounts/password';
import { Inject, Module } from '@nestjs/common';
import { GqlModuleOptions, GqlOptionsFactory, GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from 'nestjs-config';
import { resolve } from 'path';
// replace the below line with "import { AccountsJsModule } from '@nb/accountsjs-nest';"
import { AccountsJsModule, AccountsOptionsFactory, ACCOUNTS_JS_GRAPHQL, NestAccountsOptionsResult } from '../../lib';
import { UserDatabase } from '../shared/database.service';

class AppAccountsJSOptionsFactory implements AccountsOptionsFactory {
  constructor(@Inject(UserDatabase) private readonly userDatabase: UserDatabase) {}

  createAccountsOptions(): NestAccountsOptionsResult {
    return {
      serverOptions: {
        db: this.userDatabase,
        tokenSecret: 'secret',
      },
      services: {
        password: new AccountsPassword(),
      },
      GraphQL: {
        /**
         * Don't worry about this property the module will set this
         * to the resolved ACCOUNTS_JS_SERVER provider.
         * If for some reason you want to use a different server than
         * the one that's resolved you can pass it though.
         *
         */
        // accountsServer: yourServer
        /**
         * Any other Graphql module options
         * https://accounts-js.netlify.com/docs/transports/graphql#customization
         *
         * note that the defaults are probably good for you, but the option's there
         */
        //headerName: 'MyCustomHeader', // default "Authorization"
        //rootQueryName: 'RootQuery', // default "Query"
        //rootMutationName: 'RootMutation', // default "Mutation"
        //withSchemaDefinition: true, // default: false
        //userAsInterface: true, // default: false
      },
    };
  }
}

class AppGraphQLOptionsFactory implements GqlOptionsFactory {
  constructor(
    @Inject(ACCOUNTS_JS_GRAPHQL)
    private readonly accountsGQLModule: typeof AccountsModule,
  ) {}

  createGqlOptions(): GqlModuleOptions | Promise<GqlModuleOptions> {
    /**
     * Here we return the nest js/apollo server options. One of which is
     * Graphql modules. All we have to do is add this module and we're off to the races
     */
    return {
      modules: [this.accountsGQLModule],
    };
  }
}

@Module({
  providers: [UserDatabase],
  exports: [UserDatabase],
})
class UserModule {}

const AppAccountsModule = AccountsJsModule.registerAsync({
  imports: [UserModule],
  useClass: AppAccountsJSOptionsFactory,
});

@Module({
  imports: [
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    UserModule,
    /**
     * Now we need to build the graphql module
     */
    GraphQLModule.forRootAsync({
      imports: [AppAccountsModule],
      useClass: AppGraphQLOptionsFactory,
    }),
  ],
})
export class AppModule {}
