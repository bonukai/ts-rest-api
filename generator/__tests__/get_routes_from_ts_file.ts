import { createExpressRoute, registerRoute } from '@typed-rest-api/server';
import _ from 'lodash';
import { Project } from 'ts-morph';
import { generateOpenApiDocument } from '../src/generators/openapi';
import { Route } from '../src/route';
import { getRoutesFromTsFile } from '../src/find_routes';
import { OpenAPIV3 } from 'openapi-types';

const project = new Project({ compilerOptions: { strict: true } });
const sourceFile = project.addSourceFileAtPath(__filename);

describe('getRoutesFromTsFile', () => {
  const routes = getRoutesFromTsFile(sourceFile);

  test('routes', () => {
    expect(
      routes.map((route) =>
        _.omit(route, [
          'requestBody',
          'responseBody',
          'requestQuery',
          'pathParams',
        ])
      )
    ).toStrictEqual<Route[]>([
      {
        className: 'UserController',
        methodName: 'users',
        method: 'get',
        path: '/users',
        sourceFilePath: sourceFile.getFilePath(),
        description: 'Description',
        summary: 'summary',
        tags: ['tag'],
        operationId: 'operationId',
      },
      {
        className: 'UserController',
        methodName: 'user',
        method: 'get',
        path: '/user/:id',
        sourceFilePath: sourceFile.getFilePath(),
        tags: ['tag', 'tag2', 'tag3'],
      },
      {
        method: 'get',
        path: '/user2/:id',
        sourceFilePath: sourceFile.getFilePath(),
        tags: ['tag2'],
        description: 'Description2',
        operationId: 'operationId2',
        summary: 'summary2',
      },
    ]);
  });

  test('openApi', () => {
    expect(
      JSON.parse(
        generateOpenApiDocument(routes, {
          info: {
            title: 'title',
            version: '0.1',
          },
        })
      )
    ).toStrictEqual<OpenAPIV3.Document>({
      openapi: '3.0.0',
      info: {
        title: 'title',
        version: '0.1',
      },
      paths: {
        '/user/{id}': {
          get: {
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: {
                  type: 'string',
                },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/text': {
                    schema: {},
                  },
                },
                description: '',
              },
            },
            tags: ['tag', 'tag2', 'tag3'],
          },
        },
        '/users': {
          get: {
            description: 'Description',
            operationId: 'operationId',
            responses: {
              '200': {
                content: {
                  'application/text': {
                    schema: {},
                  },
                },
                description: '',
              },
            },
            summary: 'summary',
            tags: ['tag'],
          },
        },
        '/user2/{id}': {
          get: {
            description: 'Description2',
            operationId: 'operationId2',
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                description: 'id',
                schema: {
                  description: 'id',
                  type: 'number',
                },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        foo: { type: 'string', description: 'foo' },
                      },
                      required: ['foo'],
                    },
                  },
                },
                description: '',
              },
            },
            summary: 'summary2',
            tags: ['tag2'],
          },
        },
      },
    });
  });
});

/**
 * @openapi_tags tag, tag2, tag3
 */
export class UserController {
  /**
   * @description Description
   * @openapi_operationId operationId
   * @openapi_summary summary
   * @openapi_tags tag
   */
  users = createExpressRoute<{
    path: '/users';
    method: 'get';
  }>((req, res) => {});

  user = createExpressRoute<{
    path: '/user/:id';
    method: 'get';
  }>((req, res) => {});
}

/**
 * @description Description2
 * @openapi_operationId operationId2
 * @openapi_summary summary2
 * @openapi_tags tag2
 */
registerRoute<{
  path: '/user2/:id';
  method: 'get';
  pathParams: {
    /**
     * @description id
     */
    id: number;
  };
  /**
   * @openapi_contentType application/json
   */
  responseBody: {
    /**
     * @description foo
     */
    foo: string;
  };
}>();
