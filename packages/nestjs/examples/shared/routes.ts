import { ConfigService } from 'nestjs-config';
import { join } from 'path';
import request from 'supertest';

interface RouteDef {
  path: string;
  method: Method;
}

export interface GetRoutesOptions {
  password?: boolean;
  service?: string;
  oauth?: string[];
}

enum Method {
  GET = 'get',
  POST = 'post',
}

/**
 * Generate the expected routes that REST would mount
 */

export function getRoutes(rootPath: string, options: GetRoutesOptions = {}): Array<[string, string, Method]> {
  return [
    [rootPath, 'user', Method.GET],
    [rootPath, 'impersonate', Method.POST],
    [rootPath, 'refreshTokens', Method.POST],
    [rootPath, 'logout', Method.POST],
    ...(options.service ? serviceRoutes(rootPath, options.service) : []),
    ...(options.password ? passwordRoutes(rootPath) : []),
    ...(options.oauth ? oauthRoutes(rootPath, options.oauth) : []),
  ];
}

export function serviceRoutes(rootPath: string, service: string): Array<[string, string, Method]> {
  return [
    [rootPath, `${service}/verifyAuthentication`, Method.POST],
    [rootPath, `${service}/authenticate`, Method.POST],
  ];
}

export function passwordRoutes(rootPath): Array<[string, string, Method]> {
  return [
    [rootPath, 'password/register', Method.POST],
    [rootPath, 'password/verifyEmail', Method.POST],
    [rootPath, 'password/resetPassword', Method.POST],
    [rootPath, 'password/sendVerificationEmail', Method.POST],
    [rootPath, 'password/sendResetPasswordEmail', Method.POST],
  ];
}

export function oauthRoutes(rootPath: string, providers: string[]): Array<[string, string, Method]> {
  if (!providers || !providers.length) {
    providers = [':provider'];
  }

  return providers.map(provider => [rootPath, `oauth/${provider}/callback`, Method.GET]);
}

/** Test Mapping Tables */

export type RouteTestEntry = [string, boolean, string, string];

/** Basic route list to build off of */
const routeList: RouteTestEntry[] = [
  [undefined, true, null, '/accounts'],
  ['/', true, null, '/'],
  ['myPath', true, null, '/myPath'],
  ['./myPath', true, null, '/myPath'], // uses resolve relative to / if nest route isn't set
  ['/myPath', true, null, '/myPath'],
  ['/myPath/', true, null, '/myPath'],
  ['//myPath//', true, null, '/myPath'], // normalizes slashes
  ['/myPath/another', true, null, '/myPath/another'],
];
const baseRouteList = [
  ...routeList,
  ...(routeList.map(([a, b, _, d]) => [a, b, '/auth', d]) as RouteTestEntry[]), // true for ignore should be the same even if there is a nest route
];
/** tests without nest-router, expected values assume no nest-router */
export const RouteTestTableNoRouter: RouteTestEntry[] = [
  ...routeList,
  ...(routeList.map(([a, _, c, d]) => [a, false, c, d]) as RouteTestEntry[]), // false for ignore should be the same if there's no nest route
  // Setting a nest-router route shouldn't change anything if ignoreNestRoute is true
];

/** tests with nest router, need to manually define everything beyond first cases */
export const RouteTestTableWithRouter: (nestPathToUse: string) => RouteTestEntry[] = (nestPathToUse: string) => [
  // path, nest-router-path, expected root path
  ...baseRouteList,

  [undefined, false, nestPathToUse, nestPathToUse],
  ['/', false, nestPathToUse, '/'],
  ['myPath', false, nestPathToUse, `${nestPathToUse}/myPath`],
  ['./myPath', false, nestPathToUse, `${nestPathToUse}/myPath`], // uses resolve relative to / if nest route isn't set
  ['/myPath', false, nestPathToUse, '/myPath'],
  ['/myPath/', false, nestPathToUse, '/myPath'],
  ['//myPath//', false, nestPathToUse, '/myPath'], // normalizes slashes
  ['/myPath/another', false, nestPathToUse, '/myPath/another'],
];

/**
 * Utility functions
 */

export const configForPath = (path: string, ignoreNestRoute: boolean = false) =>
  new ConfigService({ auth: { path, ignoreNestRoute } });

export function RequestRoute(server: any, path: string, method: Method, prefix: string = '/'): request.Test {
  return request(server)[method](join(prefix, path));
}
