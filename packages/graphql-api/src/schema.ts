import { AccountsModule } from './modules';

export default AccountsModule.forRoot({
  accountsServer: {
    getServices: () => ({
      password: {},
      magicLink: {},
    }),
  } as any,
}).typeDefs;
