import { validateEnvironment } from './validate-environment';

describe('validateEnvironment', () => {
  it('rejects enabling development OTP in production', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production', AUTH_DEV_OTP_ENABLED: 'true',
    })).toThrow('AUTH_DEV_OTP_ENABLED is only allowed in development or test');
    expect(() => validateEnvironment({
      NODE_ENV: 'staging', AUTH_DEV_OTP_ENABLED: 'true',
    })).toThrow('AUTH_DEV_OTP_ENABLED is only allowed in development or test');
  });

  it('accepts the disabled default in production and explicit development enablement', () => {
    expect(validateEnvironment({
      NODE_ENV: 'production', AUTH_DEV_OTP_ENABLED: 'false',
    }).AUTH_DEV_OTP_ENABLED).toBe('false');
    expect(validateEnvironment({
      NODE_ENV: 'development', AUTH_DEV_OTP_ENABLED: 'true',
    }).AUTH_DEV_OTP_ENABLED).toBe('true');
  });
});
