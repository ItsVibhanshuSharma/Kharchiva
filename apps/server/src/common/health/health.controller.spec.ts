import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports that the process is alive', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });

  it('reports basic readiness', () => {
    expect(new HealthController().getReadiness()).toEqual({ status: 'ready' });
  });
});