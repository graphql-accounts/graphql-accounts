import { sharedRoutesTests } from '../../shared/sharedRouteTests';
import { AppModule } from '../app.module';

describe('with-rest-custom-route', () => {
  describe('REST', () => sharedRoutesTests(AppModule, [[undefined, true, null, '/accounts']], { password: true }));
});
