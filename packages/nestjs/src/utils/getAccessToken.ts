import { Request } from 'express';

/**
 * Helper function to get the access token out of the request header
 * @param req
 */
export function getAccessToken(req: Request): string | undefined {
  if (!req || !req.headers) {
    return undefined;
  }
  const token =
    (req && req.headers && req.headers.Authorization) || req.headers.authorization || req.body.accessToken || undefined;
  return token && token.replace('Bearer ', '');
}
