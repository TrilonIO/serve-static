import { Injectable, NotFoundException } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { AbstractHttpAdapter } from '@nestjs/core';
import * as fs from 'fs';
import { ServeStaticModuleOptions } from '../interfaces/serve-static-options.interface';
import {
  DEFAULT_RENDER_PATH,
  DEFAULT_ROOT_PATH
} from '../serve-static.constants';
import { validatePath } from '../utils/validate-path.util';
import { AbstractLoader } from './abstract.loader';

@Injectable()
export class FastifyLoader extends AbstractLoader {
  public register(
    httpAdapter: AbstractHttpAdapter,
    optionsArr: ServeStaticModuleOptions[]
  ) {
    const app = httpAdapter.getInstance();
    const fastifyStatic = loadPackage(
      'fastify-static',
      'ServeStaticModule',
      () => require('fastify-static')
    );

    optionsArr.forEach((options) => {
      options.renderPath = options.renderPath || DEFAULT_RENDER_PATH;

      const clientPath = options.rootPath || DEFAULT_ROOT_PATH;
      const indexFilePath = this.getIndexFilePath(clientPath);

      const renderFn = (req: any, res: any) => {
        fs.exists(indexFilePath, (exists: boolean) => {
          if (exists) {
            const stream = fs.createReadStream(indexFilePath);
            if (
              options.serveStaticOptions &&
              options.serveStaticOptions.setHeaders
            ) {
              const stat = fs.statSync(indexFilePath);
              options.serveStaticOptions.setHeaders(res, indexFilePath, stat);
            }
            res.type('text/html').send(stream);
          } else {
            const error = new NotFoundException();
            res.status(error.getStatus()).send(error.getResponse());
          }
        });
      };

      if (options.serveRoot) {
        app.register(fastifyStatic, {
          root: clientPath,
          ...(options.serveStaticOptions || {}),
          wildcard: false,
          prefix: options.serveRoot
        });

        const renderPath =
          typeof options.serveRoot === 'string'
            ? options.serveRoot + validatePath(options.renderPath as string)
            : options.serveRoot;

        app.get(renderPath, renderFn);
      } else {
        app.register(fastifyStatic, {
          root: clientPath,
          ...(options.serveStaticOptions || {}),
          wildcard: false
        });
        app.get(options.renderPath, renderFn);
      }
    });
  }
}
