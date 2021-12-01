# typescript-routes-to-openapi-webpack &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bonukai/typescript-routes-to-openapi/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/typescript-routes-to-openapi-webpack.svg?style=flat)](https://www.npmjs.com/package/typescript-routes-to-openapi-webpack)

[Webpack](https://webpack.js.org) plugin for [typescript-routes-to-openapi](https://github.com/bonukai/typescript-routes-to-openapi)

## Installation

```
npm install --save-dev typescript-routes-to-openapi-webpack
```

## Usage

```javascript
const {
  TypescriptRoutesToOpenApiWebpackPlugin,
} = require('typescript-routes-to-openapi-webpack');

module.exports = {
  plugins: [
    new TypescriptRoutesToOpenApiWebpackPlugin({
      openapi: {
        info: {
          version: '1.0.0',
          title: 'Swagger Petstore',
          description:
            'A sample API that uses a petstore as an example to demonstrate features in the OpenAPI 3.0 specification',
          termsOfService: 'http://swagger.io/terms/',
          contact: {
            name: 'Swagger API Team',
            email: 'apiteam@swagger.io',
            url: 'http://swagger.io',
          },
          license: {
            name: 'Apache 2.0',
            url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
          },
        },
        servers: [
          {
            url: 'http://petstore.swagger.io/api',
          },
        ],
      },
      tsConfigPath: 'tsconfig.json',
      generateOpenApiSchema: true,
      checkProgramForErrors: true,
      schemaOutputDir: './',
      schemaOutputFileName: 'openapi.json',
      routesOutputDir: 'generated',
      routesOutputFileName: 'routes.ts',
    }),
  ],
};
```
