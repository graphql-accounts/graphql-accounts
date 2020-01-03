import { User } from '@accounts/types';
import { ModuleConfig, ModuleSessionInfo } from '@graphql-modules/core';
import { getClientIp } from 'request-ip';

import { AccountsRequest, AccountsModuleConfig } from '../modules';

export interface AccountsContext<IUser = User> {
  authToken?: string;
  user?: IUser;
  userId?: string;
  error?: Error;
  [key: string]: any;
}

interface RequestExtractorResult {
  authToken?: string;
  [key: string]: any;
}

export type RequestExtractor<T = any> = (
  request: T,
  session: ModuleSessionInfo,
  moduleName: string
) => Promise<RequestExtractorResult>;

const accountsRequestExtractor: RequestExtractor<AccountsRequest> = async (
  { req }: AccountsRequest,
  { injector }: ModuleSessionInfo,
  moduleName: string
) => {
  if (!req) {
    return {
      ip: '',
      userAgent: '',
    };
  }

  const config: AccountsModuleConfig = injector.get(ModuleConfig(moduleName));
  const headerName = config.headerName || 'Authorization';
  let authToken = (req.headers[headerName] || req.headers[headerName.toLowerCase()]) as string;
  authToken = authToken && authToken.replace('Bearer ', '');

  let userAgent: string = (req.headers['user-agent'] as string) || '';
  if (req.headers['x-ucbrowser-ua']) {
    // special case of UC Browser
    userAgent = req.headers['x-ucbrowser-ua'] as string;
  }

  return {
    authToken,
    userAgent,
    ip: getClientIp(req),
  };
};

export const context = (
  moduleName: string,
  requestExtractor: RequestExtractor = accountsRequestExtractor
) => async (request: any, _: any, session: ModuleSessionInfo): Promise<AccountsContext> => {
  const res = await requestExtractor(request, session, moduleName);

  if (res.authToken) {
    const config: AccountsModuleConfig = session.injector.get(ModuleConfig(moduleName));

    if (config.excludeAddUserInContext) {
      return res;
    }

    try {
      res.user = await config.accountsServer.resumeSession(res.authToken);
    } catch (e) {
      res.error = e;
    }
  }

  return res;
};
