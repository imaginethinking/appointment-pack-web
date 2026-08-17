// AuthService has quite a few responsibilities, so these tests concentrate on session and login state.
// API calls are mocked so the tests only check frontend behaviour and do not need the backend running.

import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { LoginResponse } from '../models/auth-model';
import { AuthApiService } from './auth-api-service';
import { AuthService } from './auth-service';

describe('AuthService', () => {
  const accessTokenKey = 'appointmentPack.accessToken';
  const mfaChallengeIdKey = 'appointmentPack.mfaChallengeId';

  let authApi: {
    login: ReturnType<typeof vi.fn>;
    completeMfaLogin: ReturnType<typeof vi.fn>;
    getAccountSecurity: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    setupMfa: ReturnType<typeof vi.fn>;
    confirmMfa: ReturnType<typeof vi.fn>;
    disableMfa: ReturnType<typeof vi.fn>;
  };

  // Sets up a fresh AuthService and fake backend API before each test.
  beforeEach(() => {
    // Each test starts with an empty browser session so one test cannot affect another.
    sessionStorage.clear();

    // vi.fn() creates small fake API methods. Each test can decide what response it should return.
    authApi = {
      login: vi.fn(),
      completeMfaLogin: vi.fn(),
      getAccountSecurity: vi.fn(),
      changePassword: vi.fn(),
      setupMfa: vi.fn(),
      confirmMfa: vi.fn(),
      disableMfa: vi.fn(),
    };

    // TestBed creates AuthService in the same dependency-injection style Angular uses in the app.
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthApiService, useValue: authApi },
      ],
    });
  });

  // Clears the test state afterwards so it cannot leak into the next test.
  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  // Checks that a saved valid token is restored and only recognised application roles are kept.
  it('restores a valid authenticated session and extracts supported roles', () => {
    const token = createJwt({
      exp: futureExpiry(),
      roles: ['USER', 'ADMIN', 'UNKNOWN'],
    });
    sessionStorage.setItem(accessTokenKey, token);

    const service = TestBed.inject(AuthService);

    expect(service.authenticated()).toBe(true);
    expect(service.roles()).toEqual(new Set(['USER', 'ADMIN']));
    expect(service.isAdmin()).toBe(true);
    expect(service.getAccessToken()).toBe(token);
  });

  // Runs the same restoration check for both expired and malformed stored tokens.
  it.each([
    ['expired', createJwt({ exp: pastExpiry(), roles: ['USER'] })],
    ['malformed', 'not-a-jwt'],
  ])('clears an %s stored access token', (_description, token) => {
    sessionStorage.setItem(accessTokenKey, token);
    sessionStorage.setItem(mfaChallengeIdKey, 'stale-challenge');

    const service = TestBed.inject(AuthService);

    expect(service.authenticated()).toBe(false);
    expect(service.roles().size).toBe(0);
    expect(sessionStorage.getItem(accessTokenKey)).toBeNull();
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBeNull();
  });

  // Checks the normal login path where the backend returns a valid bearer token.
  it('stores an authenticated password-login session and clears any pending MFA challenge', async () => {
    const token = createJwt({ exp: futureExpiry(), roles: ['USER'] });
    authApi.login.mockReturnValue(of(authenticatedResponse(token)));
    sessionStorage.setItem(mfaChallengeIdKey, 'old-challenge');
    const service = TestBed.inject(AuthService);

    // AuthService returns an Observable, so firstValueFrom lets the test await the single response.
    await firstValueFrom(service.login({ email: 'user@example.com', password: 'Password1!' }));

    expect(authApi.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1!',
    });
    expect(sessionStorage.getItem(accessTokenKey)).toBe(token);
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBeNull();
    expect(service.authenticated()).toBe(true);
    expect(service.hasRole('USER')).toBe(true);
  });

  // Checks that verification-required login does not accidentally create an authenticated session.
  it('keeps the user unauthenticated when email verification is required', async () => {
    authApi.login.mockReturnValue(of({
      status: 'EMAIL_VERIFICATION_REQUIRED',
      mfaChallengeId: null,
      accessToken: null,
      tokenType: null,
    } satisfies LoginResponse));
    const service = TestBed.inject(AuthService);

    await firstValueFrom(service.login({ email: 'user@example.com', password: 'Password1!' }));

    expect(service.authenticated()).toBe(false);
    expect(sessionStorage.getItem(accessTokenKey)).toBeNull();
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBeNull();
  });

  // Checks that an MFA login pauses at the challenge stage instead of treating the user as signed in.
  it('persists an MFA challenge without authenticating the user', async () => {
    authApi.login.mockReturnValue(of({
      status: 'MFA_REQUIRED',
      mfaChallengeId: 'challenge-123',
      accessToken: null,
      tokenType: null,
    } satisfies LoginResponse));
    const service = TestBed.inject(AuthService);

    await firstValueFrom(service.login({ email: 'user@example.com', password: 'Password1!' }));

    expect(service.authenticated()).toBe(false);
    expect(service.hasPendingMfaChallenge()).toBe(true);
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBe('challenge-123');
  });

  // Checks that a successful MFA code replaces the pending challenge with the real login session.
  it('completes MFA using the persisted challenge and replaces it with an authenticated session', async () => {
    const token = createJwt({ exp: futureExpiry(), roles: ['USER', 'ADMIN'] });
    sessionStorage.setItem(mfaChallengeIdKey, 'challenge-123');
    authApi.completeMfaLogin.mockReturnValue(of(authenticatedResponse(token)));
    const service = TestBed.inject(AuthService);

    await firstValueFrom(service.completeMfaLogin('123456'));

    expect(authApi.completeMfaLogin).toHaveBeenCalledWith({
      mfaChallengeId: 'challenge-123',
      code: '123456',
    });
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBeNull();
    expect(sessionStorage.getItem(accessTokenKey)).toBe(token);
    expect(service.authenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });

  // Checks that MFA cannot be completed when there is no stored challenge to use.
  it('rejects MFA completion when no challenge is pending', async () => {
    const service = TestBed.inject(AuthService);

    await expect(firstValueFrom(service.completeMfaLogin('123456'))).rejects.toThrow(
      'No MFA login challenge is pending.',
    );
    expect(authApi.completeMfaLogin).not.toHaveBeenCalled();
  });

  // Checks that incomplete backend login data is rejected rather than stored as a valid session.
  it('rejects an invalid authenticated login response without persisting a session', async () => {
    authApi.login.mockReturnValue(of({
      status: 'AUTHENTICATED',
      mfaChallengeId: null,
      accessToken: 'token-without-bearer-type',
      tokenType: null,
    } satisfies LoginResponse));
    const service = TestBed.inject(AuthService);

    await expect(
      firstValueFrom(service.login({ email: 'user@example.com', password: 'Password1!' })),
    ).rejects.toThrow('The server returned an invalid authenticated login response.');

    expect(service.authenticated()).toBe(false);
    expect(sessionStorage.getItem(accessTokenKey)).toBeNull();
  });

  // Checks that cancelling MFA removes all temporary and authenticated login state.
  it('clears access-token, roles and MFA state when MFA login is cancelled', () => {
    const token = createJwt({ exp: futureExpiry(), roles: ['USER', 'ADMIN'] });
    sessionStorage.setItem(accessTokenKey, token);
    sessionStorage.setItem(mfaChallengeIdKey, 'challenge-123');
    const service = TestBed.inject(AuthService);

    expect(service.authenticated()).toBe(true);

    service.cancelMfaLogin();

    expect(service.authenticated()).toBe(false);
    expect(service.roles().size).toBe(0);
    expect(sessionStorage.getItem(accessTokenKey)).toBeNull();
    expect(sessionStorage.getItem(mfaChallengeIdKey)).toBeNull();
  });

  // Checks that logout removes the token and role information from the frontend session.
  it('clears the authenticated session on logout', () => {
    const token = createJwt({ exp: futureExpiry(), roles: ['USER'] });
    sessionStorage.setItem(accessTokenKey, token);
    const service = TestBed.inject(AuthService);

    service.logout();

    expect(service.authenticated()).toBe(false);
    expect(service.roles().size).toBe(0);
    expect(service.getAccessToken()).toBeNull();
  });
});

// Creates a normal successful login response so the same object does not have to be repeated in each test.
function authenticatedResponse(accessToken: string): LoginResponse {
  return {
    status: 'AUTHENTICATED',
    mfaChallengeId: null,
    accessToken,
    tokenType: 'Bearer',
  };
}

// Creates a simple unsigned JWT-shaped value because the frontend only needs to read its expiry and roles.
function createJwt(payload: Record<string, unknown>): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${header}.${encodedPayload}.signature`;
}

// Converts test JWT data into the base64-url format used inside a JWT.
function encodeBase64Url(value: string): string {
  return btoa(value)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Returns an expiry time one hour in the future for a token that should still be valid.
function futureExpiry(): number {
  return Math.floor(Date.now() / 1000) + 3_600;
}

// Returns an expiry time in the past for a token that should be treated as expired.
function pastExpiry(): number {
  return Math.floor(Date.now() / 1000) - 1;
}
