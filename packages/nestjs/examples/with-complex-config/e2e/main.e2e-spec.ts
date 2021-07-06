import { RouteTestTableNoRouter } from '../../shared/routes';
import { sharedRoutesTests } from '../../shared/sharedRouteTests';
import { AppModule } from '../app.module';

describe('with-complex-config', () => {
  describe('REST', () => sharedRoutesTests(AppModule, RouteTestTableNoRouter, { password: true }));
});
