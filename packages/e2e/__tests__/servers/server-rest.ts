import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import fetch from 'node-fetch';

// Server
import { AccountsServer } from '@accounts/server';
import { AccountsPassword } from '@accounts/password';
import accountsExpress from '@accounts/rest-express';
import { User, DatabaseInterface } from '@accounts/types';

// Client
import { AccountsClient } from '@accounts/client';
import { AccountsClientPassword } from '@accounts/client-password';
import { RestClient } from '@accounts/rest-client';

import { DatabaseTestInterface } from '../databases';
import { DatabaseTest } from '../databases/mongo';
import { ServerTestInterface } from './index';

(global as any).fetch = fetch;

const convertUrlToToken = (url: string): string => {
  const split = url.split('/');
  return split[split.length - 1];
};

export class ServerRestTest implements ServerTestInterface {
  public port = 3000;

  public accountsServer: AccountsServer;
  public accountsPassword: AccountsPassword;
  public accountsDatabase: DatabaseInterface;

  public accountsClient: AccountsClient;
  public accountsClientPassword: AccountsClientPassword;

  public emails: any[];

  private databaseTest: DatabaseTestInterface;
  private app: express.Express;
  private server?: http.Server;

  constructor() {
    this.databaseTest = new DatabaseTest();
    this.accountsDatabase = this.databaseTest.accountsDatabase;
    this.accountsPassword = new AccountsPassword();
    this.accountsServer = new AccountsServer(
      {
        db: this.accountsDatabase,
        tokenSecret: 'test',
        emailTemplates: {
          from: 'accounts-js <no-reply@accounts-js.com>',
          verifyEmail: {
            subject: () => 'Verify your account email',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          resetPassword: {
            subject: () => 'Reset your password',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          enrollAccount: {
            subject: () => 'Set your password',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
          passwordChanged: {
            subject: () => 'Your password has been changed',
            text: () => `Your account password has been successfully changed`,
            html: () => `Your account password has been successfully changed.`,
          },
          magicLink: {
            subject: () => 'Your magic link',
            text: (user: User, url: string) => convertUrlToToken(url),
          },
        },
        sendMail: async (mail) => {
          this.emails.push(mail);
        },
      },
      {
        password: this.accountsPassword,
      }
    );

    /**
     * Setup express
     */
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(accountsExpress(this.accountsServer));

    const accountsRest = new RestClient({
      apiHost: `http://localhost:${this.port}`,
      rootPath: '/accounts',
    });
    this.accountsClient = new AccountsClient({}, accountsRest);
    this.accountsClientPassword = new AccountsClientPassword(this.accountsClient);
    this.emails = [];
  }

  public async start() {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    await this.databaseTest.start();
  }

  public async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server!.close(resolve));
    }
    await this.databaseTest.stop();
  }
}
