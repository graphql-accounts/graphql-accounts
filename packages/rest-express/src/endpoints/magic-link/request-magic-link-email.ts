import * as express from 'express';
import { AccountsJsError, AccountsServer } from '@accounts/server';
import { AccountsMagicLink, RequestMagicLinkEmailErrors } from '@accounts/magic-link';
import { sendError } from '../../utils/send-error';

export const requestMagicLinkEmail = (accountsServer: AccountsServer) => async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email } = req.body;
    const accountsMagicLink = accountsServer.getServices().magicLink as AccountsMagicLink;
    try {
      await accountsMagicLink.requestMagicLinkEmail(email);
    } catch (error) {
      // If ambiguousErrorMessages is true,
      // to prevent user enumeration we fail silently in case there is no user attached to this email
      if (
        accountsServer.options.ambiguousErrorMessages &&
        error instanceof AccountsJsError &&
        error.code === RequestMagicLinkEmailErrors.UserNotFound
      ) {
        return res.json(null);
      }
      throw error;
    }
    res.json(null);
  } catch (err) {
    sendError(res, err);
  }
};
