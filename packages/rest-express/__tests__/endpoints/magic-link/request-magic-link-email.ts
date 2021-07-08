import { RequestMagicLinkEmailErrors } from '@accounts/magic-link';
import { AccountsJsError } from '@accounts/server';
import { requestMagicLinkEmail } from '../../../src/endpoints/magic-link/request-magic-link-email';

const res: any = {
  json: jest.fn(),
  status: jest.fn(() => res),
};

describe('verifyEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestMagicLinkEmail', () => {
    it('calls magicLink.requestMagicLinkEmail and returns a message', async () => {
      const magicLinkService = {
        requestMagicLinkEmail: jest.fn(() => null),
      };
      const accountsServer = {
        getServices: () => ({
          magicLink: magicLinkService,
        }),
      };
      const middleware = requestMagicLinkEmail(accountsServer as any);

      const req = {
        body: {
          email: 'email',
        },
        headers: {},
      };
      const reqCopy = { ...req };

      await middleware(req as any, res);

      expect(req).toEqual(reqCopy);
      expect(accountsServer.getServices().magicLink.requestMagicLinkEmail).toHaveBeenCalledWith(
        'email'
      );
      expect(res.json).toHaveBeenCalledWith(null);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('Sends error if it was thrown on requestMagicLinkEmail', async () => {
      const error = { message: 'Could not send magic link email' };
      const magicLinkService = {
        requestMagicLinkEmail: jest.fn(() => {
          throw error;
        }),
      };
      const accountsServer = {
        options: {},
        getServices: () => ({
          magicLink: magicLinkService,
        }),
      };
      const middleware = requestMagicLinkEmail(accountsServer as any);
      const req = {
        body: {
          email: 'email',
        },
        headers: {},
      };
      const reqCopy = { ...req };

      await middleware(req as any, res);

      expect(req).toEqual(reqCopy);
      expect(accountsServer.getServices().magicLink.requestMagicLinkEmail).toHaveBeenCalledWith(
        'email'
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(error);
    });

    it('hide UserNotFound error when ambiguousErrorMessages is true', async () => {
      const error = new AccountsJsError('User not found', RequestMagicLinkEmailErrors.UserNotFound);
      const magicLinkService = {
        requestMagicLinkEmail: jest.fn(() => {
          throw error;
        }),
      };
      const accountsServer = {
        options: {
          ambiguousErrorMessages: true,
        },
        getServices: () => ({
          magicLink: magicLinkService,
        }),
      };
      const middleware = requestMagicLinkEmail(accountsServer as any);
      const req = {
        body: {
          email: 'email',
        },
        headers: {},
      };
      const reqCopy = { ...req };

      await middleware(req as any, res);

      expect(req).toEqual(reqCopy);
      expect(accountsServer.getServices().magicLink.requestMagicLinkEmail).toHaveBeenCalledWith(
        'email'
      );
      expect(res.json).toHaveBeenCalledWith(null);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
