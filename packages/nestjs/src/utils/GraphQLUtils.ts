import { AccountsModuleContext } from '@accounts/graphql-api';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { isArray } from 'util';
import { AccountsSessionRequest } from '../interfaces/AccountsRequest';

export type GQLParam = [any, any, Context, any]; // [root,args,context,info]

export interface RequestContext {
  req?: AccountsSessionRequest;
}

type Context = AccountsModuleContext & RequestContext;

// todo: improve return types

export function isGQLParam(obj: any): obj is GQLParam {
  return isArray(obj) && obj.length === 4; // todo: be a litle smarter about this
}

export function getGQLRoot<TRoot = any>(param: AccountsSessionRequest | GQLParam): TRoot | any {
  return isGQLParam(param) && param[0];
}
export function getGQLArgs<TArgs = any>(param: AccountsSessionRequest | GQLParam): TArgs | undefined {
  return isGQLParam(param) && param[1];
}
export function getGQLContext<TContext extends Context>(
  param: AccountsSessionRequest | GQLParam,
): TContext | undefined {
  return (isGQLParam(param) && (param[2] as TContext)) || undefined;
}
export function getGQLInfo<TInfo = any>(param: AccountsSessionRequest | GQLParam): TInfo | undefined {
  return isGQLParam(param) && param[3];
}

/**
 * I'm not sure how useful this actually is, It seems like there has to be forking logic for graphql vs rest or other transports
 */
export function getFieldFromDecoratorParams<K extends keyof AccountsSessionRequest>(
  param: AccountsSessionRequest | GQLParam,
  field: K,
  ...fields: any
): AccountsSessionRequest[K];
export function getFieldFromDecoratorParams<K extends keyof Context>(
  param: AccountsSessionRequest | GQLParam,
  field: K,
  ...fields: any
): Context[K];
export function getFieldFromDecoratorParams(param: AccountsSessionRequest | GQLParam, ...fields: any[]): any {
  if (isGQLParam(param)) {
    const ctx = getGQLContext(param);
    return ctx && (deepGet(ctx, fields) || (ctx.req && deepGet(ctx.req, fields)));
  }
  return deepGet(param, fields) || null;
}

function deepGet(obj: any, fields: any[]): any {
  if (!obj || !fields || !fields.length) return null;

  const field = fields.shift();
  if (!field) return obj; // avoid undefined or null fields, just result with this object

  return !fields.length ? obj[field] : deepGet(obj[field], fields);
}

export function GetFieldFromExecContext(context: ExecutionContext, ...fields: any[]): any {
  const ctx = GqlExecutionContext.create(context);
  const gqlCtx = ctx.getContext();
  if (gqlCtx) {
    return deepGet(gqlCtx, fields);
  }
  const req = context.switchToHttp().getRequest() as AccountsSessionRequest;
  return deepGet(req, fields);
}
