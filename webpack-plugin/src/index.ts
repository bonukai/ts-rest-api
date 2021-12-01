import type { Compiler } from 'webpack';
import type { ConfigType } from 'typescript-routes-to-openapi';
import { typescriptRoutesToOpenApi } from 'typescript-routes-to-openapi';

const pluginName = 'TypescriptRoutesToOpenApiWebpackPlugin';

export class TypescriptRoutesToOpenApiWebpackPlugin {
  private readonly config;

  constructor(config?: ConfigType) {
    this.config = config;
  }

  apply(compiler: Compiler) {
    compiler.hooks.emit.tap(pluginName, () => {
      typescriptRoutesToOpenApi(this.config);
    });
  }
}
