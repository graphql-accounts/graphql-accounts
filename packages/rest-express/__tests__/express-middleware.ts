import accountsExpress from '../src';
import * as express from 'express';

jest.mock('express', () => {
  const mockRouter = {
    use: jest.fn(),
    post: jest.fn(),
    get: jest.fn(),
  };
  return {
    Router: () => mockRouter,
  };
});

const router = express.Router();

describe('express middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Defines default endpoints on given path fragment', () => {
    accountsExpress(
      {
        getServices: () => ({}),
      } as any,
      { path: 'test' }
    );
    expect((router.post as jest.Mock).mock.calls[0][0]).toBe('test/impersonate');
    expect((router.post as jest.Mock).mock.calls[1][0]).toBe('test/user');
    expect((router.post as jest.Mock).mock.calls[2][0]).toBe('test/refreshTokens');
    expect((router.post as jest.Mock).mock.calls[3][0]).toBe('test/logout');
    expect((router.post as jest.Mock).mock.calls[4][0]).toBe('test/:service/verifyAuthentication');
    expect((router.post as jest.Mock).mock.calls[5][0]).toBe('test/:service/authenticate');

    expect((router.get as jest.Mock).mock.calls[0][0]).toBe('test/user');
  });

  it('Defines password endpoints when password service is present', () => {
    accountsExpress(
      {
        getServices: () => ({
          password: {},
        }),
      } as any,
      { path: 'test' }
    );
    expect((router.post as jest.Mock).mock.calls[0][0]).toBe('test/impersonate');
    expect((router.post as jest.Mock).mock.calls[1][0]).toBe('test/user');
    expect((router.post as jest.Mock).mock.calls[2][0]).toBe('test/refreshTokens');
    expect((router.post as jest.Mock).mock.calls[3][0]).toBe('test/logout');
    expect((router.post as jest.Mock).mock.calls[4][0]).toBe('test/:service/verifyAuthentication');
    expect((router.post as jest.Mock).mock.calls[5][0]).toBe('test/:service/authenticate');
    expect((router.post as jest.Mock).mock.calls[6][0]).toBe('test/password/register');
    expect((router.post as jest.Mock).mock.calls[7][0]).toBe('test/password/verifyEmail');
    expect((router.post as jest.Mock).mock.calls[8][0]).toBe('test/password/resetPassword');
    expect((router.post as jest.Mock).mock.calls[9][0]).toBe('test/password/sendVerificationEmail');
    expect((router.post as jest.Mock).mock.calls[10][0]).toBe(
      'test/password/sendResetPasswordEmail'
    );

    expect((router.get as jest.Mock).mock.calls[0][0]).toBe('test/user');
  });

  it('Defines magic link endpoints when magicLink service is present', () => {
    accountsExpress(
      {
        getServices: () => ({
          magicLink: {},
        }),
      } as any,
      { path: 'test' }
    );
    expect((router.post as jest.Mock).mock.calls[0][0]).toBe('test/impersonate');
    expect((router.post as jest.Mock).mock.calls[1][0]).toBe('test/user');
    expect((router.post as jest.Mock).mock.calls[2][0]).toBe('test/refreshTokens');
    expect((router.post as jest.Mock).mock.calls[3][0]).toBe('test/logout');
    expect((router.post as jest.Mock).mock.calls[4][0]).toBe('test/:service/verifyAuthentication');
    expect((router.post as jest.Mock).mock.calls[5][0]).toBe('test/:service/authenticate');

    expect((router.post as jest.Mock).mock.calls[6][0]).toBe(
      'test/magiclink/requestMagicLinkEmail'
    );

    expect((router.get as jest.Mock).mock.calls[0][0]).toBe('test/user');
  });

  it('Defines oauth endpoints when oauth service is present', () => {
    accountsExpress(
      {
        getServices: () => ({
          oauth: {},
        }),
      } as any,
      { path: 'test' }
    );
    expect((router.post as jest.Mock).mock.calls[0][0]).toBe('test/impersonate');
    expect((router.post as jest.Mock).mock.calls[1][0]).toBe('test/user');
    expect((router.post as jest.Mock).mock.calls[2][0]).toBe('test/refreshTokens');
    expect((router.post as jest.Mock).mock.calls[3][0]).toBe('test/logout');
    expect((router.post as jest.Mock).mock.calls[4][0]).toBe('test/:service/verifyAuthentication');
    expect((router.post as jest.Mock).mock.calls[5][0]).toBe('test/:service/authenticate');

    expect((router.get as jest.Mock).mock.calls[0][0]).toBe('test/user');
    expect((router.get as jest.Mock).mock.calls[1][0]).toBe('test/oauth/:provider/callback');
  });

  it('Handles passing of a slash as the path', () => {
    accountsExpress(
      {
        getServices: () => ({}),
      } as any,
      { path: '/' }
    );
    expect((router.post as jest.Mock).mock.calls[0][0]).toBe('/impersonate');
    expect((router.post as jest.Mock).mock.calls[1][0]).toBe('/user');
    expect((router.post as jest.Mock).mock.calls[2][0]).toBe('/refreshTokens');
    expect((router.post as jest.Mock).mock.calls[3][0]).toBe('/logout');
    expect((router.post as jest.Mock).mock.calls[4][0]).toBe('/:service/verifyAuthentication');
    expect((router.post as jest.Mock).mock.calls[5][0]).toBe('/:service/authenticate');

    expect((router.get as jest.Mock).mock.calls[0][0]).toBe('/user');
  });
});
