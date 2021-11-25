import { OpenAPIV3 } from 'openapi-types';
import _ from 'lodash';

import { Route } from '../route';
import { isReferenceObject, TsToOpenApiTypeParser } from '../type_parser';
import { getPathParams, filterNonValidAndEmptyProperties } from '../utils';
import { parse } from 'path-to-regexp';

const isContentTypeBinary = (contentType?: string) => {
  return (
    contentType?.startsWith('image/') ||
    contentType?.startsWith('audio/') ||
    contentType?.startsWith('video/')
  );
};

export const mapPathParamsToOpenApi = (
  pathParams: TsToOpenApiTypeParser | undefined,
  path: string
): OpenAPIV3.ParameterObject[] => {
  const paramsFromPath = getPathParams(path);
  const pathParamsFromSchema = pathParams?.resolveRootProperties();

  return paramsFromPath.map((key) => {
    const name = key.name.toString();
    const type = pathParamsFromSchema ? pathParamsFromSchema[name] : undefined;

    if (key.optional) {
      throw new Error(
        `OpenApi 3.0.0 does not support optional path params, at: ${
          pathParams ? pathParams.filePathAndLineNumberOfParentNode() : path
        }. See https://github.com/OAI/OpenAPI-Specification/issues/93`
      );
    }

    return {
      name: name,
      in: 'path',
      required: true,
      description: type ? type.description : undefined,
      example: type ? type.example : undefined,
      schema: type
        ? type
        : {
            type: 'string',
          },
    };
  });
};

export const mapQueryParamsToOpenApi = (queryParams: TsToOpenApiTypeParser) => {
  return Object.entries(
    queryParams.getAllRootProperties()
  ).map<OpenAPIV3.ParameterObject>(([key, type]) => {
    if (isReferenceObject(type)) {
      const resolvedType = queryParams.resolveReferencedSchema(type);

      return {
        name: key,
        in: 'query',
        description: resolvedType.description,
        required: !resolvedType.nullable,
        schema: type,
      };
    } else
      return {
        name: key,
        in: 'query',
        description: type.description,
        required: !type.nullable,
        schema: type,
      };
  });
};

export const mapRequestBodyToOpenApi = (requestBody: TsToOpenApiTypeParser) => {
  const contentType =
    requestBody.getRootJsDocTag('openapi_contentType') || 'application/json';

  return {
    required: true,
    content: {
      [contentType]: {
        schema: {
          format: isContentTypeBinary(contentType) ? 'binary' : undefined,
          ...requestBody.openApiSchema(),
        },
      },
    },
  };
};

export const mapResponseBodyToOpenApi = (
  responseBody: TsToOpenApiTypeParser
) => {
  const contentType =
    responseBody.getRootJsDocTag('openapi_contentType') || 'application/json';

  const statusCode = responseBody.getRootJsDocTag('openapi_statusCode') || 200;
  const description = responseBody.getRootJsDocTag('description') || '';

  return {
    [statusCode]: {
      description: description,
      content: {
        [contentType]: {
          schema: {
            format: isContentTypeBinary(contentType) ? 'binary' : undefined,
            ...responseBody.openApiSchema(),
          },
        },
      },
    },
  };
};

const defaultResponse = {
  '200': {
    description: '',
    content: {
      'application/text': {
        schema: {},
      },
    },
  },
};

export const expressPathToOpenApi = (path: string) => {
  return parse(path)
    .map((key) => {
      if (typeof key === 'string') {
        return key;
      }

      return `${key.prefix}{${key.name}}`;
    })
    .join('');
};

export const generateOpenApiDocument = (
  routes: Route[],
  document: Omit<
    OpenAPIV3.Document,
    | 'openapi'
    | 'paths'
    | 'components'
    | 'x-express-openapi-additional-middleware'
    | 'x-express-openapi-validation-strict'
  > & {
    components?: Omit<OpenAPIV3.ComponentsObject, 'schemas'>;
  }
): string => {
  const _routes: Record<
    string,
    OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  > = routes.reduce(
    (res, route) => ({
      ...res,
      ...route.requestBody?.openApiDefinitions(),
      ...route.requestQuery?.openApiDefinitions(),
      ...route.responseBody?.openApiDefinitions(),
    }),
    {}
  );

  const paths = _(routes)
    .groupBy((route) => route.path)
    .mapKeys((routes, path) => expressPathToOpenApi(path))
    .mapValues<OpenAPIV3.PathItemObject>((routes) => {
      return _(routes)
        .groupBy((route) => route.method)
        .mapValues((routes) => routes.at(0)!)
        .mapValues<OpenAPIV3.PathItemObject>((route) =>
          filterNonValidAndEmptyProperties({
            summary: route.summary,
            description: route.description,
            tags: route.tags,
            operationId: route.operationId,
            parameters: [
              ...mapPathParamsToOpenApi(route.pathParams, route.path),
              ...(route.requestQuery
                ? mapQueryParamsToOpenApi(route.requestQuery)
                : []),
            ],
            requestBody: route.requestBody
              ? mapRequestBodyToOpenApi(route.requestBody)
              : undefined,
            responses: route.responseBody
              ? mapResponseBodyToOpenApi(route.responseBody)
              : defaultResponse,
          })
        )
        .value();
    })
    .value();

  const components = {
    securitySchemes: document.components?.securitySchemes,
    schemas: _routes,
  };

  const schema: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: document.info,
    servers: document.servers,
    security: document.security,
    tags: document.tags,
    externalDocs: document.externalDocs,
    paths: paths,
    components: filterNonValidAndEmptyProperties(components),
  };

  return JSON.stringify(filterNonValidAndEmptyProperties(schema), null, 2);
};
