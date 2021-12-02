import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import prettier from 'prettier';

import { Route } from '../route';
import { TsToOpenApiTypeParser } from '../type_parser';
import { getPathParams, visitOpenApiSchema } from '../utils';

/**
 * ajv coerceTypes does not support enum with multiple types, like: `['a', 1]`
 * @param enumTypes
 * @returns
 */
const _splitMultiTypeEnum = (
  enumTypes: (string | boolean | number | null)[]
) => {
  const grouped = _(enumTypes).groupBy((t) => typeof t);

  if (grouped.size() === 1) {
    return;
  }

  return grouped
    .mapValues((value, key) => {
      if (value.at(0) === null) {
        return {
          type: 'null',
        };
      }

      return {
        enum: value,
        type: key,
      };
    })
    .values()
    .value();
};

export const splitMultiTypeEnum = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
) => {
  const res = { ...schema };

  visitOpenApiSchema(res, (child) => {
    if (
      'enum' in child &&
      child.enum &&
      child.enum.length > 0 &&
      !('type' in child)
    ) {
      const splitted = _splitMultiTypeEnum(child.enum);

      if (splitted) {
        delete child.enum;
        child.oneOf = splitted as any;

        if (child.nullable) {
          delete child.nullable;
        }
      }
    }
  });

  return res;
};

const classInstanceName = (className: string) => {
  return `_${className}`;
};

const generateClassImports = (routes: Route[], outputDirectory: string) => {
  return routes
    .map((route) => {
      const parsedPath = path.parse(
        path.relative(outputDirectory, route.sourceFilePath!)
      );

      return `import { ${route.className} } from '${path
        .join(parsedPath.dir, parsedPath.name)
        .split(path.sep)
        .join(path.posix.sep)}';`;
    })
    .join('\n');
};

const generateInstancesDeclarations = (routes: Route[]) => {
  return routes
    .map(
      (route) =>
        `const ${classInstanceName(route.className!)} = new ${route.className};`
    )
    .join('\n');
};

const generatePathParamsSchema = (
  path: string,
  pathParams?: TsToOpenApiTypeParser
): OpenAPIV3.SchemaObject => {
  const paramsFromPath = getPathParams(path);
  const pathParamsFromSchema = pathParams
    ? pathParams.resolveRootProperties()
    : {};

  const properties = paramsFromPath.reduce((res, key) => {
    const name = key.name.toString();
    const type = pathParamsFromSchema[name];

    return {
      ...res,
      [name]: type
        ? type
        : {
            type: 'string',
            nullable: key.optional,
          },
    };
  }, {});

  return {
    type: 'object',
    properties: properties,
    required: paramsFromPath
      .filter((pathParam) => !pathParam.optional)
      .map((pathParam) => pathParam.name),
    nullable: false,
  };
};

export const generateRoutesCalls = (routes: Route[]) => {
  return routes
    .filter((route) => route.className && route.methodName)
    .map(
      (route) =>
        `router.${route.method}('${route.path}', validatorHandler({
        ${[
          getPathParams(route.path).length > 0
            ? `pathParamsSchema: ${JSON.stringify(
                generatePathParamsSchema(route.path, route.pathParams)
              )}`
            : undefined,
          route.requestQuery
            ? `requestQuerySchema: ${JSON.stringify(
                splitMultiTypeEnum(route.requestQuery.jsonSchema() as any)
              )}`
            : undefined,
          route.requestBody
            ? `requestBodySchema: ${JSON.stringify(
                splitMultiTypeEnum(route.requestBody.jsonSchema() as any)
              )}`
            : undefined,
        ]
          .filter(Boolean)
          .join(',')}
      }), ${classInstanceName(route.className!)}.${route.methodName});`
    )
    .join('\n');
};

export const generateRoutes = (routes: Route[], outputDirectory: string) => {
  const schemasWithUniqueClass = _(routes)
    .filter(
      (route) => route.className != undefined && route.methodName != undefined
    )
    .uniqBy((route) => route.className)
    .value();

  const code = `// This file was generated by typescript-routes-to-openapi
  
  import express, { RequestHandler, Router } from 'express';
  import Ajv, { ErrorObject } from 'ajv';
  import { ValidationError } from 'typescript-routes-to-openapi';
  
  const ajv = new Ajv({
    allErrors: true,
    coerceTypes: true,
    verbose: true,
    removeAdditional: true,
  });
  
  const validatorHandler = (args: {
    pathParamsSchema?: any;
    requestQuerySchema?: any;
    requestBodySchema?: any;
  }): RequestHandler => {
    const { pathParamsSchema, requestQuerySchema, requestBodySchema } = args;
  
    const pathParamsValidator =
      pathParamsSchema && ajv.compile(pathParamsSchema);
    const requestQueryValidator =
      requestQuerySchema && ajv.compile(requestQuerySchema);
    const requestBodySchemaValidator =
      requestBodySchema && ajv.compile(requestBodySchema);
  
    return (req, res, next) => {
      if (pathParamsValidator && !pathParamsValidator(req.params)) {
        next(
          new ValidationError(
            pathParamsValidator.errors,
            ajv.errorsText(pathParamsValidator.errors, {
              dataVar: 'Path params',
            })
          )
        );
      } else if (requestQueryValidator && !requestQueryValidator(req.query)) {
        next(
          new ValidationError(
            requestQueryValidator.errors,
            ajv.errorsText(requestQueryValidator.errors, {
              dataVar: 'Query string',
            })
          )
        );
      } else if (
        requestBodySchemaValidator &&
        !requestBodySchemaValidator(req.body)
      ) {
        next(
          new ValidationError(
            requestBodySchemaValidator.errors,
            ajv.errorsText(requestBodySchemaValidator.errors, {
              dataVar: 'Request body',
            })
          )
        );
      } else {
        next();
      }
    };
  };
  
  ${generateClassImports(schemasWithUniqueClass, outputDirectory)}
  
  ${generateInstancesDeclarations(schemasWithUniqueClass)}
    
  const router: Router = express.Router();
  
  ${generateRoutesCalls(routes)}  
    
  export { router as generatedRoutes };
  `;

  const resultText = prettier.format(code, {
    semi: true,
    singleQuote: true,
    printWidth: 80,
    parser: 'typescript',
  });

  return resultText;
};
