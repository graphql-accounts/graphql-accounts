import { RouteTestTableNoRouter } from '../../shared/routes';
import { sharedRoutesTests } from '../../shared/sharedRouteTests';
import { AppModule } from '../app.module';

describe('with-complex-class-config', () => {
  describe('REST', () => sharedRoutesTests(AppModule, RouteTestTableNoRouter, { password: true }));
});
