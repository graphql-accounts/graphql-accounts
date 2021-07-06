import { AccountsServer, ServerHooks } from '@accounts/server';
import { User } from '@accounts/types';
import { Inject, Injectable } from '@nestjs/common';
import { url } from 'gravatar';
import { ACCOUNTS_JS_OPTIONS, ACCOUNTS_JS_SERVER, NestAccountsOptions } from '../../'; // Replace with @nb/nestjs-accountsjs
import { UserDatabase } from '../shared/database.service';

interface AppUser extends User {
  profile: {
    avatarURL: string;
  };
}

/* eslint-disable require-await */
@Injectable()
export class UserService {
  constructor(
    // Use the ACCOUNTS_JS_SERVER token to inject the server
    @Inject(ACCOUNTS_JS_SERVER) private readonly accounts: AccountsServer,
    // use the ACCOUNTS_JS_OPTIONS token to inject the options
    @Inject(ACCOUNTS_JS_OPTIONS) private readonly accountsOptions: NestAccountsOptions,
    @Inject(UserDatabase) private readonly userDatabase: UserDatabase,
  ) {
    this.initHooks();
    // use accountsjs options
    if (this.accountsOptions.services.password) {
      // do something
      this.initPasswordHooks();
    }
  }

  private initHooks() {
    this.accounts.on(ServerHooks.CreateUserSuccess, (...args) => this.onCreateUser(...args));
  }

  private initPasswordHooks() {
    this.accounts.on(ServerHooks.ChangePasswordSuccess, (...args) => {
      console.log('Password changed', ...args);
    });
  }

  public async onCreateUser(user: User) {
    // Here we can do anything we want to do on user creation, such as default a profile in
    await this.updateUser(user.id);
  }

  public async updateUser(id: string) {
    // We query the database (mocked in this example) for the user and update the profile on the record
    const userRecord = (await this.userDatabase.findUserById(id)) as AppUser;
    // Let's add a gravatar profile avatar to the user
    const email = userRecord.emails[0].address;
    const avatarURL = url(email, { default: 'identicon', rating: 'g' });
    userRecord.profile.avatarURL = avatarURL;
    // save the user (un-needed in the example)
  }
}
