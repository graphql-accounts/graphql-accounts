import set from 'lodash.set';
import { AccountsMagicLink } from '../src';

describe('AccountsMagicLink', () => {
  const server: any = {
    options: {},
    getHooks: () => ({
      emit: jest.fn(),
    }),
    loginWithUser: jest.fn(),
  };
  const magicLink = new AccountsMagicLink({});
  magicLink.server = server;

  const validUser: any = {
    id: 'id',
    services: {
      magicLink: {
        loginTokens: [{ token: 'toto' }],
      },
    },
  };

  afterEach(() => {
    magicLink.server = server;
    jest.clearAllMocks();
  });

  describe('config', () => {
    it('should have default options', async () => {
      expect((magicLink as any).options.loginTokenExpiration).toBe(900000);
    });
  });

  describe('authenticate', () => {
    it('throws on invalid params', async () => {
      await expect(magicLink.authenticate({} as any)).rejects.toThrowError(
        'Unrecognized options for login request'
      );
    });

    it('throws on invalid type params', async () => {
      await expect(magicLink.authenticate({ user: 'toto', token: 3 } as any)).rejects.toThrowError(
        'Match failed'
      );
    });

    it('return user', async () => {
      const user = {
        services: {},
      };
      const tmpAccountsMagicLink = new AccountsMagicLink({});
      (tmpAccountsMagicLink as any).magicLinkAuthenticator = jest.fn(() => Promise.resolve(user));
      const removeAllLoginTokens = jest.fn(() => Promise.resolve());
      tmpAccountsMagicLink.setStore({ removeAllLoginTokens } as any);
      const ret = await tmpAccountsMagicLink.authenticate({
        user: 'toto',
        token: 'toto',
      } as any);
      expect(ret).toEqual(user);
      expect(removeAllLoginTokens.mock.calls[0].length).toBe(1);
    });

    it('throws when user not found', async () => {
      const findUserByLoginToken = jest.fn(() => Promise.resolve());
      magicLink.setStore({ findUserByLoginToken } as any);
      await expect(
        magicLink.authenticate({
          user: 'toto@toto.com',
          token: 'toto',
        } as any)
      ).rejects.toThrowError('Login token expired');
    });

    it('throws on incorrect token', async () => {
      const findUserByLoginToken = jest.fn(() => Promise.resolve({ id: 'id' }));
      magicLink.setStore({ findUserByLoginToken } as any);
      await expect(
        magicLink.authenticate({
          user: 'toto@toto.com',
          token: 'toto',
        } as any)
      ).rejects.toThrowError('Login token expired');
    });

    it('throws when token is expired', async () => {
      const findUserByLoginToken = jest.fn(() => Promise.resolve(validUser));
      magicLink.isTokenExpired = jest.fn(() => true);
      magicLink.setStore({ findUserByLoginToken } as any);
      await expect(
        magicLink.authenticate({
          user: 'toto@toto.com',
          token: 'toto',
        } as any)
      ).rejects.toThrowError('Login token expired');
    });
  });

  describe('requestLoginToken', () => {
    const verifiedEmail = 'john.doe@gmail.com';
    const unverifiedEmail = 'john.doe2@gmail.com';
    const validUser = {
      emails: [
        { address: unverifiedEmail, verified: false },
        { address: verifiedEmail, verified: true },
      ],
    };

    it('throws if email is empty', async () => {
      await expect(magicLink.requestMagicLinkEmail('')).rejects.toThrowError('Invalid email');
    });

    it('throws if user is not found', async () => {
      const findUserByEmail = jest.fn(() => Promise.resolve());
      magicLink.setStore({ findUserByEmail } as any);
      await expect(magicLink.requestMagicLinkEmail(unverifiedEmail)).rejects.toThrowError(
        'User not found'
      );
    });

    it('send email', async () => {
      const findUserByEmail = jest.fn(() => Promise.resolve(validUser));
      const addLoginToken = jest.fn(() => Promise.resolve());
      const removeAllLoginTokens = jest.fn(() => Promise.resolve());
      const prepareMail = jest.fn(() => Promise.resolve());
      const sanitizeUser = jest.fn(() => Promise.resolve());
      const sendMail = jest.fn(() => Promise.resolve());
      magicLink.setStore({ findUserByEmail, addLoginToken, removeAllLoginTokens } as any);
      magicLink.server = {
        prepareMail,
        options: { sendMail },
        sanitizeUser,
      } as any;
      set(magicLink.server, 'options.emailTemplates', {});
      await magicLink.requestMagicLinkEmail(verifiedEmail);
      expect(removeAllLoginTokens.mock.calls[0].length).toBe(1);
      expect(addLoginToken.mock.calls[0].length).toBe(3);
      expect(prepareMail.mock.calls[0].length).toBe(6);
      expect(sendMail.mock.calls[0].length).toBe(1);
    });
  });
});
