import { print } from 'graphql';
import { AccountsModule } from '../../../src/modules/accounts/index';

const accountsServer = {
  getServices: () => ({
    password: {},
    magicLink: {},
  }),
};

describe('AccountsModule', () => {
  describe('withSchemaDefinition', () => {
    it('should export typeDefs with schema definition', () => {
      const accountsGraphQL = AccountsModule.forRoot({
        accountsServer: accountsServer as any,
        withSchemaDefinition: true,
      });
      expect(print(accountsGraphQL.typeDefs)).toMatch(/schema/);
    });

    it('should export typeDefs without schema definition', () => {
      const accountsGraphQL = AccountsModule.forRoot({
        accountsServer: accountsServer as any,
        withSchemaDefinition: false,
      });
      expect(print(accountsGraphQL.typeDefs)).not.toMatch(/schema/);
    });
  });

  describe('extendTypeDefs', () => {
    it('should extends typeDefs', () => {
      const accountsGraphQL = AccountsModule.forRoot({
        accountsServer: accountsServer as any,
        extendTypeDefs: true,
      });
      expect(print(accountsGraphQL.typeDefs)).toMatch(/extend/);
    });

    it('should not extends typeDefs', () => {
      const accountsGraphQL = AccountsModule.forRoot({
        accountsServer: accountsServer as any,
        extendTypeDefs: false,
      });
      expect(print(accountsGraphQL.typeDefs)).not.toMatch(/extend/);
    });
  });
});
