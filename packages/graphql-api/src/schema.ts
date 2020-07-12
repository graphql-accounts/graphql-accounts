import 'reflect-metadata';
import { AccountsModule } from './modules';

export default AccountsModule.forRoot({
  tokenSecret: 'my-secret',
  db: { codegen: true },
  services: {
    password: [undefined],
  },
}).typeDefs;
