import { AppModule } from '../app.module';
import { sharedRoutesTests } from '../../shared/sharedRouteTests';

describe('basic-value-opts', () => {
  describe('REST', () => sharedRoutesTests(AppModule, [['/', true, '/', '/']], { password: true }));
});
