export function validateEnvironment(config: Record<string, unknown>) {
  const devOtpEnabled = config.AUTH_DEV_OTP_ENABLED;
  const environment = String(config.NODE_ENV ?? '').toLowerCase();
  if (
    devOtpEnabled === 'true' &&
    environment !== 'development' &&
    environment !== 'test'
  ) {
    throw new Error('AUTH_DEV_OTP_ENABLED is only allowed in development or test');
  }
  if (devOtpEnabled !== undefined && !['true', 'false'].includes(String(devOtpEnabled))) {
    throw new Error('AUTH_DEV_OTP_ENABLED must be true or false');
  }
  return config;
}
