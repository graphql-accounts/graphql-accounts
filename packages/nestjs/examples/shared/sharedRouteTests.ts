import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RouterModule } from 'nest-router';
import { ConfigService } from 'nestjs-config';
import { AccountsJsModule } from '../../lib';
import { configForPath, getRoutes, GetRoutesOptions, RequestRoute, RouteTestEntry } from './routes';

export function sharedRoutesTests(AppModule: any, pathTables: RouteTestEntry[], routesOptions: GetRoutesOptions = {}) {
  describe.each(pathTables)(
    'mount routes for path %s IgnoreNestRoute: %p nestRoute: %s',
    (path, ignoreNestRoute, relativePath, expectedRootPath) => {
      let app: INestApplication;

      beforeAll(async () => {
        const imports = [];
        // If there's a relative route setup NestRouter
        if (relativePath) {
          imports.push(RouterModule.forRoutes([{ module: AccountsJsModule, path: relativePath as any }]));
        }

        const moduleFixture = await Test.createTestingModule({
          imports: [...imports, AppModule],
        })
          .overrideProvider(ConfigService)
          .useValue(configForPath(path as any, ignoreNestRoute as any))
          .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
      });

      it.each(getRoutes(expectedRootPath as any, routesOptions))(
        `should mount route: %s/%s (%s)`,
        async (rootPath, path, method) => {
          const res = await RequestRoute(app.getHttpServer(), path, method, expectedRootPath as any);

          expect(res.notFound).toBe(false);
        },
      );
    },
  );
}
