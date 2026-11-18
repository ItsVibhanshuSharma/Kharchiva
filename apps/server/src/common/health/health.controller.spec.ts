import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  it('reports that the process is alive', () => {
    expect(new HealthController({ readyState: 0 } as never).getHealth()).toEqual({ status: 'ok' });
  });

  it('reports readiness only after MongoDB connects', () => {
    expect(new HealthController({ readyState: 1 } as never).getReadiness()).toEqual({ status: 'ready' });
    expect(() => new HealthController({ readyState: 0 } as never).getReadiness()).toThrow(
      ServiceUnavailableException,
    );
  });
});
