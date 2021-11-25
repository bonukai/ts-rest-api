import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { Key, pathToRegexp } from 'path-to-regexp';
import { isReferenceObject } from './type_parser';

export const filterNonValidAndEmptyProperties = <T extends object>(
  object: T
) => {
  return _.pickBy(object, (value) => {
    if (!value) {
      return false;
    }

    if (typeof value === 'object') {
      return !_.isEmpty(value);
    }

    return true;
  });
};

export const getPathParams = (path: string) => {
  const keys: Key[] = [];
  pathToRegexp(path, keys);

  return keys.map((key) => {
    const name = key.name.toString();

    return {
      name: name,
      optional: key.modifier === '?',
    };
  });
};

export const visitOpenApiSchema = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  handler: (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject) => void
): void => {
  handler(schema);

  if (!isReferenceObject(schema)) {
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([name, value]) => {
        visitOpenApiSchema(value, handler);
      });
    } else if (schema.oneOf) {
      schema.oneOf.forEach((s) => {
        visitOpenApiSchema(s, handler);
      });
    } else if (schema.allOf) {
      schema.allOf.forEach((s) => {
        visitOpenApiSchema(s, handler);
      });
    } else if ('items' in schema && schema.items) {
      visitOpenApiSchema(schema.items, handler);
    }

    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties !== 'boolean'
    ) {
      visitOpenApiSchema(schema.additionalProperties, handler);
    }
  }
};
