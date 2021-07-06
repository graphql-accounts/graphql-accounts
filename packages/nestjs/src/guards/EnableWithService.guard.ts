import AccountsServer from '@accounts/server';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ACCOUNTS_JS_SERVER, ENABLE_FOR_ACCOUNTS_SERVICE } from '../utils/accounts.constants';

@Injectable()
export class EnableWithService implements CanActivate {
  constructor(
    @Inject(ACCOUNTS_JS_SERVER)
    private readonly accountsServer: AccountsServer,
    private readonly reflector: Reflector,
  ) {}

  // tslint:disable-next-line:variable-name
  private _services: any;
  get services() {
    if (!this._services) {
      this._services = this.accountsServer.getServices();
    }
    return this._services || {};
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return this.scopeHasService(context.getClass()) && this.scopeHasService(context.getHandler());
  }

  // tslint:disable-next-line:ban-types
  scopeHasService(context: Type<any> | Function): boolean {
    const serviceName = this.reflector.get(ENABLE_FOR_ACCOUNTS_SERVICE, context);
    if (!serviceName) {
      // If there's no service, allow it
      return true;
    }
    return !!this.services[serviceName];
  }
}
