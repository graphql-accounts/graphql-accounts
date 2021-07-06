> Full user management with Accounts.JS and Nest.js in minutes.

# Basic Usage

`npm i @nb/nestjs-accountsjs`

> note: currently I only have this on my personal NPM registry. Make an issue to remind me to make it public if you can't install it with `npm i @nb/nestjs-accountsjs --registry npm.nickbolles.com`

### [Basic Config](./examples/basic-value-opts)

app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { Mongo } from '@accounts/mongo';
import { AccountsPassword } from '@accounts/password';
import { AccountsJsModule } from '@nb/nestjs-accountsjs';

@Module({
  imports: [
    AccountsJsModule.register({
      serverOptions: {
        // Options passed to the AccountsServer instance
        db: new Mongo(),
        tokenSecret: 'secret',
      },
      services: {
        // Services passed as the second parameter to the AccountsServer Instance
        password: new AccountsPassword(),
      },
      REST: true, // or an Object with any @accounts/rest options
      GraphQL: true, // or an Object with any @accounts/graphql-api options
    }),
  ],
})
export class AppModule {}
```

### With Accounts Server Instance

Alternatively you can pass the accountsjs server that you want to use to register:

```typescript
AccountsJsModule.register({ useServer: accountsServerInstance });
```

### [With Options Factory Class](./examples/with-complex-class-config)

app.module.ts

```typescript
import { Module } from '@nestjs/common';
import { Mongo } from '@accounts/mongo';
import { AccountsPassword } from '@accounts/password';
import { AccountsJsModule } from '@nb/nestjs-accountsjs';
import { AppAccountsOptionsFactory } from './AppAccountsOptionsFactory';

@Module({
  imports: [AccountsJsModule.registerAsync({ useClass: AppAccountsOptionsFactory })],
})
export class AppModule {}
```

AppAccountsOptionsFactory.ts

```typescript
class AppAccountsOptionsFactory implements AccountsOptionsFactory {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  createAccountsOptions(): NestAccountsOptionsResult {
    return {
      serverOptions: {
        db: new Mongo(),
        tokenSecret: this.configService.get('secret'),
      },
      services: {
        password: new AccountsPassword(),
      },
      REST: true, // or an Object with any @accounts/rest options
      GraphQL: true, // or an Object with any @accounts/graphql-api options
    };
  }
}
```

> Register can take any [custom provider](https://docs.nestjs.com/fundamentals/custom-providers) format. IMHO, the useClass pattern, and breaking the options factory class into it's own file is the most clean format.

### Examples

- [basic-value-opts](./examples/basic-value-opts)
- [with-complex-class-config](./examples/with-complex-class-config)
- [with-complex-config (useFactory)](./examples/with-complex-config)
- See the [./examples](./examples) directory for more examples

## Built in support for REST and GraphQL

### REST

Passing `REST: true`, or a config object will enable and mount the `@accounts/rest-express` package.

### Examples

- [with-rest](./examples/with-rest)
- [with-rest-and-nest-router](./examples/with-rest-and-nest-router)
- [with-rest-custom-route](./examples/with-rest-custom-route)

#### Config

`true` for defaults, or an object with the following keys

| Key                                                                                       |   Default   | Description                                                                                         |
| ----------------------------------------------------------------------------------------- | :---------: | --------------------------------------------------------------------------------------------------- |
| path                                                                                      | `/accounts` | The path to mount on                                                                                |
| relative                                                                                  |   `true`    | Is the path Relative to the nest route, passing an absolute path is the same as making this `false` |
| ...[AccountsExpressOptions](https://accounts-js.netlify.com/docs/transports/rest-express) |             | any other AccountsExpress options                                                                   |

#### REST Path

By default it mounts at the MODULE_PATH, which is the same as what [`nest-router`](https://github.com/nestjsx/nest-router) configures. If it's not configured it defaults to `/accounts`.

| Config                      | Nest router module config |      Path      |                         Examples                          |
| --------------------------- | :-----------------------: | :------------: | :-------------------------------------------------------: |
| `{REST: true}`              |           none            |  `/accounts`   |    `/accounts/user`, `/accounts/:service/authenticate`    |
| `{REST: true}`              |          `/auth`          |    `/auth`     |        `/auth/user`, `/auth/:service/authenticate`        |
| `{REST: {path: "myPath"}}`  |          `/auth`          | `/auth/myPath` | `/auth/myPath/user`, `/auth/myPath/:service/authenticate` |
| `{REST: {path: "/myPath"}}` |          `/auth`          |   `/myPath`    |      `/myPath/user`, `/myPath/:service/authenticate`      |

> The path is passed into [`resolve`](https://nodejs.org/api/url.html#url_url_resolve_from_to) for example: `resolve("/auth", "myPath")` -> `/auth/myPath`, or `resolve("/auth","/myPath")` -> `/myPath`

#### Relative urls

By default the path is relative to the NEST path as in the second to last example above. You can override this by setting the `relative` option to `false`. Really this is equal to passing an absolute path as in the last example above

| Config                                       | Nest router module config |    Path     |                      Examples                       |
| -------------------------------------------- | :-----------------------: | :---------: | :-------------------------------------------------: |
| `{REST: {relative: false}}`                  |           none            | `/accounts` | `/accounts/user`, `/accounts/:service/authenticate` |
| `{REST: {relative: false}}`                  |          `/auth`          | `/accounts` | `/accounts/user`, `/accounts/:service/authenticate` |
| `{REST: {path: "myPath", relative: false}}`  |          `/auth`          |  `/myPath`  |   `/myPath/user`, `/myPath/:service/authenticate`   |
| `{REST: {path: "/myPath", relative: false}}` |          `/auth`          |  `/myPath`  |   `/myPath/user`, `/myPath/:service/authenticate`   |

### GraphQL

The module will configure `@accounts/graphql-api` and export it as the ACCOUNTS_JS_GRAPHQL provider. This make it easy to use it with `@nestjs/graphql`

#### Examples

- [with-graphql](./examples/with-graphql)
- [with-graphql-complex](./examples/with-graphql-complex)

#### Config

`true` to use defaults, or an object of [AccountsModuleConfig](https://accounts-js.netlify.com/docs/transports/graphql#customization)

#### Mounting

app.module.ts

```typescript
import { Module, Inject } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { AccountsModule } from '@accounts/graphql-api';
import {
  AccountsJsModule,
  ACCOUNTS_JS_GRAPHQL,
  AccountsOptionsFactory,
  NestAccountsOptionsResult,
} from '@nb/nestjs-accountsjs';

@Module({
  imports: [
    AccountsJsModule.register({
      accountsOptions: {
        serverOptions: {
          db: this.userDatabase,
          tokenSecret: 'secret',
        },
        services: {
          password: new AccountsPassword(),
        },
        GraphQL: true,
      },
    }),
    GraphQLModule.forRootAsync({
      inject: [ACCOUNTS_JS_GRAPHQL], // Inject the build GraphQL-Module
      useFactory: (accountsGQLModule: typeof AccountsModule) => {
        return {
          modules: [accountsGQLModule], // Pass the module to @nestjs/graphql -> Apollo server
          // or:
          // schema: accountsGQLModule.schemaAsync,
          // context: this.accountsJSGraphQLModule.context
        };
      },
    }),
  ],
})
export class AppModule {}
```

#### Merging with Code First schemas

Usually you're going to have other GraphQL types and resolvers, merging these with the AccountsGQLModule gets a little bit more tricky. Since Accounts uses GraphQLModules we can utilize their utilities to transform the auto generated schema that nestjs creates.

```typescript
GraphQLModule.forRootAsync({
  inject: [ACCOUNTS_JS_GRAPHQL], // Inject the build GraphQL-Module
  useFactory: (accountsGQLModule: typeof AccountsModule) => {
    const { context } = this.accountsJSGraphQLModule;

    return {
      autoSchemaFile: 'schema.gql',
      context,
      // ... any other @nestjs/graphql Options
      transformSchema: async autoGenSchema => {
        // Intersect the schema and add in AccountsJS GQL Types, resolvers and directives
        return new GraphQLModule({
          extraSchemas: [autoGenSchema],
          imports: [this.accountsJSGraphQLModule],
        });
      },
    };
  },
});
```

#### Merging with schema first

// todo

# Providers

### Examples

- [with-inject-server-and-opts](./examples/with-inject-server-and-opts)

The module will register several providers for accounts js. This enables these core items for dependency injection in Nest, which can be really powerful. For example you can inject the server into your users service and add an event listener for user created to populate the user with default data. See an example in the [with-inject-server-and-opts](./examples/with-inject-server-and-opts) example

| Injector Token      |                                 Value                                 |                    Type                     |
| ------------------- | :-------------------------------------------------------------------: | :-----------------------------------------: |
| ACCOUNTS_JS_SERVER  |                       `AccountsServer` Instance                       |              `AccountsServer`               |
| ACCOUNTS_JS_OPTIONS | Options for AccountsServer, AccountsServer services, REST and GraphQL |            `NestAccountsOptions`            |
| ACCOUNTS_JS_GRAPHQL |                       Accounts JS GraphQLModule                       | AccountsModule from `@accounts/graphql-api` |

# Decorators

### Examples

- [with-decorators](./examples/with-decorators)
- [with-auth-guard](./examples/with-auth-guard)

## Param Decorators

Decorators to match several of the request fields that accounts provides. These are compatible with both HTTP Request handlers and Graphql resolvers and helps to make code more concise and self-documenting

| Name      |               Usage               |             Shorthand for             |
| --------- | :-------------------------------: | :-----------------------------------: |
| User      |    `@User() currentUser: User`    |              `req.user`               |
| UserId    |    `@UserID() userId: string`     |             `req.user.id`             |
| AuthToken | `@AuthToken() authToken?: string` | multiple, `req.headers.Authorization` |
| ClientIP  |  `@ClientIP() clientIP: string`   |               multiple                |
| UserAgent | `@UserAgent() userAgent: string`  |               multiple                |

## Auth Guard

2 more special decorators exist. The first is `@UseGuards(AuthGuard)`. Auth guard, but default will check for the presence of a user on the Execution context. This can be used at either the class or the method handler level

Class level:

```typescript
class MyController {
  @Get()
  @UseGuards(AuthGuard)
  mySecret() {
    return 'I was a jedi';
  }
}
```

Method level:

```typescript
@UseGuards(AuthGuard)
class MyController {
  @Get()
  mySecret() {
    return 'I was a jedi';
  }
}
```

With GraphQL it's exactly the same

```typescript
@Resolver()
class MyResolver {
  @Query()
  @UseGuards(AuthGuard)
  mySecret() {
    return 'I was a jedi';
  }
}
```

## AuthValidator

The second is `@AuthValidator`, which can be used to customize the AuthGuard behavior. Validators are functions that return a boolean, or a promise that resolves to a boolean. If the result is truthy, the validator succeeds and if all validators succeed the method will be executed.

Validators can be added at the class or the method level, and will stack. So in the example below the `@UseGuards(AuthGuard)` will run the class validator, `IsDarthVader`, then it will run `TalkingToLuke` and `AsyncValidator`. If any of them fail, the method will not be run.

```typescript
import {
    AuthGuard,
    AuthValidator,
    AccountsSessionRequest,
    GQLParam } from "@nb/nestjs-accountsjs"
import { User } from "@accounts/types"

const IsDarthVader = (user: User, params: AccountsSessionRequest | GQLParam, context: ExecutionContext) => user.username === "Darth Vader"

const TalkingToLuke = (user: User, context: ExecutionContext, params: AccountsSessionRequest) => params.body.talkingToLuke)

const AsyncValidator = (user: User) => Promise.resolve(true);

@AuthValidator(IsDarthVader)
class DarthVader {
    @Get()
    @UseGuards(AuthGuard)
    @AuthValidator(TalkingToLuke, AsyncValidator)
    superSecret() {
        return "Luke, I am your father"
    }
}
```

### Making Validators Robust

Note: these are likely to change. There is development in nestjs core 6.7 that adds getType to execution context. Once this is added to the GraphQLExecutionContext we'll update this to pass only the context. If you can, avoid using the third parameter

Above, the `TalkingToLuke` validator is HTTP specific because it uses the body to the request. We can make this a little more robust by using some of the util methods provided, such as `isGQLParam` `getGQLcontext`, `getFieldFromDecoratorParams` and `getFieldFormExecContext`.

```typescript
import {
  AuthGuard,
  AuthValidator,
  AccountsSessionRequest,
  GQLParam,
  isGQLParam,
  getGQLContext,
} from '@nb/nestjs-accountsjs';
import { User } from '@accounts/types';

const IsDarthVader = (user: User) => (user.username = 'Darth Vader');

const TalkingToLuke = (user: User, context: ExecutionContext, params: AccountsSessionRequest | GQLParam) =>
  isGQLParam(params) ? getGQLContext(params).talkingToLuke : params.body.talkingToLuke;

const AsyncValidator = () => Promise.resolve(true);

@Resolver()
@UseGuards(AuthGuard)
@AuthValidator(IsDarthVader)
class DarthVader {
  @Query()
  @AuthValidator(TalkingToLuke, AsyncValidator)
  superSecret() {
    return 'I am your father';
  }
}
```

## Other Decorators

`@EnableForService` - Guard to only enable if a service exists currently not fully implemented

# Interceptor

This module will mount The `AccountsSessionInterceptor` to initialize the session. This is registered as an `APP_INTERCEPTOR`, so it will be in effect for the entire app. This is also required for any of the decorators to function correctly.
