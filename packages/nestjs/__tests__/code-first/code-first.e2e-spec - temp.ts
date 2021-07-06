import { AccountsModule } from '@accounts/graphql-api';
import AccountsPassword from '@accounts/password';
import { DatabaseInterface } from '@accounts/types';
import { GraphQLModule } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import { mergeSchemas } from 'graphql-tools';
import request from 'supertest';
import { Field, ObjectType } from 'type-graphql';
import { AccountsJsModule, ACCOUNTS_JS_GRAPHQL } from '../../src';
import { MockDatabase } from '../fixtures/MockDatabase';

@ObjectType('AppUser') // Required to rename the GraphqlType because
class User {}

@ObjectType()
class Recipe {
  @Field()
  name: string;
  @Field()
  description: string;
  @Field(_type => User)
  author: User;
}

describe('code-first', () => {
  let app;
  let db: DatabaseInterface;
  beforeEach(async () => {
    db = new MockDatabase();
    const accountsModuleFixture = AccountsJsModule.registerAsync({
      serverOptions: {
        db,
        tokenSecret: 'foo',
      },
      services: {
        password: new AccountsPassword(),
      },
      REST: {
        path: '/',
      },
      GraphQL: {},
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        accountsModuleFixture,
        GraphQLModule.forRootAsync({
          imports: [accountsModuleFixture],
          inject: [ACCOUNTS_JS_GRAPHQL],
          useFactory: async (accountsJsGraphql: typeof AccountsModule) => {
            const { schema, context } = accountsJsGraphql;

            return {
              autoSchemaFile: 'temp/auto_schema_tests.gql',
              // Wire up accountsJsGraphql
              /**
               * Initiates the session and stores data onto the context
               * interface: AccountsModuleContext<IUser = User>
               */
              context,
              /**
               * Use the hook provided by the GraphQL Module
               * to merge the accounts schema into the generated schema
               * note: only the autoGenSchema will be present in the autoSchemaFile
               */
              transformSchema: autoGenSchema => {
                return mergeSchemas({ schemas: [autoGenSchema, schema] });
              },
            };
          },
        }),
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });
  it('should mount graphql correctly', async () => {
    await request(app.getHttpServer())
      .get('/graphql')
      .expect(200);
  });
});
