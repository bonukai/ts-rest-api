import { Project } from 'ts-morph';
import { TsToOpenApiTypeParser } from '../src/type_parser';

const project = new Project({ compilerOptions: { strict: true } });
const sourceFile = project.addSourceFileAtPath(__filename);

const getSchemas = (typeName: string) => {
  const parser = new TsToOpenApiTypeParser({
    node: sourceFile
      .forEachChildAsArray()
      .find((node) => node.getType().getText() === typeName)!,
    noTopRef: true,
  });

  return {
    jsonSchema: parser.jsonSchema(),
    openApiSchema: parser.openApiSchema(),
    openApiDefinitions: parser.openApiDefinitions(),
  };
};

const typeA = {
  type: 'object',
  properties: {
    a: { type: 'string' },
  },
  required: ['a'],
};

const typeB = {
  type: 'object',
  properties: {
    b: { type: 'number' },
    one: { type: 'string' },
    two: { type: 'string' },
  },
  required: ['b', 'one', 'two'],
};

const typeC = {
  type: 'object',
  properties: {
    c: { oneOf: [{ type: 'string' }, { type: 'number' }] },
  },
  required: ['c'],
};

describe('tsTypeToJsonSchema', () => {
  test('BaseTypes', () => {
    const { jsonSchema, openApiSchema } = getSchemas('BaseTypes');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        any: {},
        unknown: {},
        string: { type: 'string' },
        number: { type: 'number' },
        boolean: { type: 'boolean' },
        true: { type: 'boolean', enum: [true] },
        false: { type: 'boolean', enum: [false] },
        stringLiteral: { type: 'string', enum: ['string literal'] },
        numberLiteral: { type: 'number', enum: [1] },
        // never: { type: 'string' },
        // undefined: { type: 'string' },
        // null: { type: 'string' },
      },
      required: [
        'any',
        'number',
        'string',
        'boolean',
        'true',
        'false',
        'stringLiteral',
        'numberLiteral',
        // 'never',
        // 'null',
        // 'undefined',
        'unknown',
      ].sort(),
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        any: {},
        unknown: {},
        string: { type: 'string' },
        number: { type: 'number' },
        boolean: { type: 'boolean' },
        true: { type: 'boolean', enum: [true] },
        false: { type: 'boolean', enum: [false] },
        stringLiteral: { type: 'string', enum: ['string literal'] },
        numberLiteral: { type: 'number', enum: [1] },
        // never: { type: 'string' },
        // undefined: { type: 'string' },
        // null: { type: 'string' },
      },
      required: [
        'any',
        'number',
        'string',
        'boolean',
        'true',
        'false',
        'stringLiteral',
        'numberLiteral',
        // 'never',
        // 'null',
        // 'undefined',
        'unknown',
      ].sort(),
    });
  });

  test('NumberNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('NumberNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['number', 'null'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'number',
      nullable: true,
    });
  });

  test('StringNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('StringNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['string', 'null'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      nullable: true,
    });
  });

  test('ArrayType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ArrayType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'array',
      items: {
        type: 'string',
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'array',
      items: {
        type: 'string',
      },
    });
  });

  test('ArrayNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ArrayNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['array', 'null'],
      items: {
        type: 'string',
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'array',
      items: {
        type: 'string',
      },
      nullable: true,
    });
  });

  test('EnumType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('EnumType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['Red', 'Green', 'Blue'].sort(),
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      enum: ['Red', 'Green', 'Blue'].sort(),
    });
  });

  test('EnumNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('EnumNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['Red', 'Green', 'Blue', null].sort(),
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      enum: ['Red', 'Green', 'Blue', null].sort(),
      nullable: true,
    });
  });

  test('UnionType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
    });
  });

  test('UnionNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
        {
          type: 'null',
        },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      oneOf: [
        {
          type: 'string',
        },
        {
          type: 'number',
        },
      ],
      nullable: true,
    });
  });

  test('UnionType2', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionType2');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['a', 'b', 'c', 'd'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      enum: ['a', 'b', 'c', 'd'],
    });
  });

  test('UnionType3', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionType3');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'number',
      enum: [0, 1, 2, 3],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'number',
      enum: [0, 1, 2, 3],
    });
  });

  test('UnionType4', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionType4');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      enum: [0, 1, 2, 3, 'a', 'b', 'c', 'd'].sort(),
    });

    expect(openApiSchema).toStrictEqual({
      enum: [0, 1, 2, 3, 'a', 'b', 'c', 'd'].sort(),
    });
  });

  test('UnionType4Nullable', () => {
    const { jsonSchema, openApiSchema } = getSchemas('UnionType4Nullable');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      enum: [0, 1, 2, 3, 'a', 'b', 'c', 'd', null].sort(),
    });

    expect(openApiSchema).toStrictEqual({
      enum: [0, 1, 2, 3, 'a', 'b', 'c', 'd', null].sort(),
      nullable: true,
    });
  });

  test('ObjectType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ObjectType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      required: ['bar', 'foo'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      required: ['bar', 'foo'],
    });
  });

  test('ObjectNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ObjectNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['object', 'null'],
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      required: ['bar', 'foo'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      required: ['bar', 'foo'],
      nullable: true,
    });
  });

  test('IntersectionType', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } =
      getSchemas('IntersectionType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        A: typeA,
        B: typeB,
        C: typeC,
      },
      allOf: [
        { $ref: '#/definitions/A' },
        { $ref: '#/definitions/B' },
        { $ref: '#/definitions/C' },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      allOf: [
        { $ref: '#/components/schemas/A' },
        { $ref: '#/components/schemas/B' },
        { $ref: '#/components/schemas/C' },
      ],
    });

    expect(openApiDefinitions).toStrictEqual({
      A: typeA,
      B: typeB,
      C: typeC,
    });
  });

  test('IntersectionNullableType', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } = getSchemas(
      'IntersectionNullableType'
    );

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        A: typeA,
        B: typeB,
        C: typeC,
      },
      oneOf: [
        {
          allOf: [
            { $ref: '#/definitions/A' },
            { $ref: '#/definitions/B' },
            { $ref: '#/definitions/C' },
          ],
        },
        { type: 'null' },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      allOf: [
        { $ref: '#/components/schemas/A' },
        { $ref: '#/components/schemas/B' },
        { $ref: '#/components/schemas/C' },
      ],
      nullable: true,
    });

    expect(openApiDefinitions).toStrictEqual({
      A: typeA,
      B: typeB,
      C: typeC,
    });
  });

  test('IntersectionAndUnionType', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } = getSchemas(
      'IntersectionAndUnionType'
    );

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        A: typeA,
        B: typeB,
        C: typeC,
      },
      oneOf: [
        { allOf: [{ $ref: '#/definitions/A' }, { $ref: '#/definitions/B' }] },
        { allOf: [{ $ref: '#/definitions/A' }, { $ref: '#/definitions/C' }] },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      oneOf: [
        {
          allOf: [
            { $ref: '#/components/schemas/A' },
            { $ref: '#/components/schemas/B' },
          ],
        },
        {
          allOf: [
            { $ref: '#/components/schemas/A' },
            { $ref: '#/components/schemas/C' },
          ],
        },
      ],
    });

    expect(openApiDefinitions).toStrictEqual({
      A: typeA,
      B: typeB,
      C: typeC,
    });
  });

  test('IntersectionAndUnionNullableType', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } = getSchemas(
      'IntersectionAndUnionNullableType'
    );

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        A: typeA,
        B: typeB,
        C: typeC,
      },
      oneOf: [
        { allOf: [{ $ref: '#/definitions/A' }, { $ref: '#/definitions/B' }] },
        { allOf: [{ $ref: '#/definitions/A' }, { $ref: '#/definitions/C' }] },
        { type: 'null' },
      ],
    });

    expect(openApiSchema).toStrictEqual({
      oneOf: [
        {
          allOf: [
            { $ref: '#/components/schemas/A' },
            { $ref: '#/components/schemas/B' },
          ],
        },
        {
          allOf: [
            { $ref: '#/components/schemas/A' },
            { $ref: '#/components/schemas/C' },
          ],
        },
      ],
      nullable: true,
    });

    expect(openApiDefinitions).toStrictEqual({
      A: typeA,
      B: typeB,
      C: typeC,
    });
  });

  test('OmitType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('OmitType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        b: { type: 'number' },
        two: { type: 'string' },
      },
      required: ['b', 'two'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        b: { type: 'number' },
        two: { type: 'string' },
      },
      required: ['b', 'two'],
    });
  });

  test('OmitNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('OmitNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['object', 'null'],
      properties: {
        b: { type: 'number' },
        two: { type: 'string' },
      },
      required: ['b', 'two'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        b: { type: 'number' },
        two: { type: 'string' },
      },
      required: ['b', 'two'],
      nullable: true,
    });
  });

  test('ExcludeType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ExcludeType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['b', 'c', 'd'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      enum: ['b', 'c', 'd'],
    });
  });

  test('ExcludeNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('ExcludeNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['b', 'c', 'd', null],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'string',
      enum: ['b', 'c', 'd', null],
      nullable: true,
    });
  });

  test('PartialNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('PartialNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['object', 'null'],
      properties: {
        b: { type: ['number', 'null'] },
        one: { type: ['string', 'null'] },
        two: { type: ['string', 'null'] },
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        b: { type: 'number', nullable: true },
        one: { type: 'string', nullable: true },
        two: { type: 'string', nullable: true },
      },
      nullable: true,
    });
  });

  test('PickType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('PickType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        one: { type: 'string' },
      },
      required: ['one'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        one: { type: 'string' },
      },
      required: ['one'],
    });
  });

  test('PickNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('PickNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['object', 'null'],
      properties: {
        one: { type: 'string' },
      },
      required: ['one'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        one: { type: 'string' },
      },
      required: ['one'],
      nullable: true,
    });
  });

  test('RecordType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('RecordType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    });
  });

  test('RecordNullableType', () => {
    const { jsonSchema, openApiSchema } = getSchemas('RecordNullableType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: ['object', 'null'],
      additionalProperties: {
        type: 'string',
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
      nullable: true,
    });
  });

  test('RecordType2', () => {
    const { jsonSchema, openApiSchema } = getSchemas('RecordType2');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['b', 'one', 'two'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['b', 'one', 'two'],
    });
  });

  test('RecordType3', () => {
    const { jsonSchema, openApiSchema } = getSchemas('RecordType3');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['b', 'one', 'two'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['b', 'one', 'two'],
    });
  });

  test('RecordType4', () => {
    const { jsonSchema, openApiSchema } = getSchemas('RecordType4');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          bar: { type: 'number' },
        },
        required: ['bar', 'foo'],
      },
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          bar: { type: 'number' },
        },
        required: ['bar', 'foo'],
      },
    });
  });

  test('RecursiveType', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } =
      getSchemas('RecursiveType');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        RecursiveType: {
          type: 'object',
          properties: {
            parent: {
              oneOf: [
                {
                  $ref: '#/definitions/RecursiveType',
                },
                {
                  type: 'null',
                },
              ],
            },
            children: {
              type: 'array',
              items: {
                $ref: '#/definitions/RecursiveType',
              },
            },
          },
          required: ['children'],
        },
      },
      type: 'object',
      properties: {
        parent: {
          oneOf: [
            {
              $ref: '#/definitions/RecursiveType',
            },
            {
              type: 'null',
            },
          ],
        },
        children: {
          type: 'array',
          items: {
            $ref: '#/definitions/RecursiveType',
          },
        },
      },
      required: ['children'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        parent: {
          allOf: [
            {
              $ref: '#/components/schemas/RecursiveType',
            },
          ],
          nullable: true,
        },
        children: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/RecursiveType',
          },
        },
      },
      required: ['children'],
    });

    expect(openApiDefinitions).toStrictEqual({
      RecursiveType: {
        type: 'object',
        properties: {
          parent: {
            allOf: [
              {
                $ref: '#/components/schemas/RecursiveType',
              },
            ],
            nullable: true,
          },
          children: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/RecursiveType',
            },
          },
        },
        required: ['children'],
      },
    });
  });

  test('ObjectWithNullableRefs', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } = getSchemas(
      'ObjectWithNullableRefs'
    );

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        A: typeA,
        C: typeC,
      },
      type: 'object',
      properties: {
        a: {
          oneOf: [
            {
              $ref: '#/definitions/A',
            },
            {
              type: 'null',
            },
          ],
        },
        c: {
          $ref: '#/definitions/C',
        },
      },
      required: ['c'],
    });

    expect(openApiSchema).toStrictEqual({
      type: 'object',
      properties: {
        a: {
          allOf: [
            {
              $ref: '#/components/schemas/A',
            },
          ],
          nullable: true,
        },
        c: {
          $ref: '#/components/schemas/C',
        },
      },
      required: ['c'],
    });
  });

  test('NamedEnums', () => {
    const { jsonSchema, openApiSchema, openApiDefinitions } =
      getSchemas('NamedEnums');

    expect(jsonSchema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        NamedEnum: {
          enum: ['a', 'b', 'c'],
          type: 'string',
        },
        EnumFromArray: {
          enum: ['a', 'b', 'c'],
          type: 'string',
        },
        NamedStringType: {
          type: 'string',
        },
      },
      properties: {
        namedEnum: {
          $ref: '#/definitions/NamedEnum',
        },
        enumFromArray: {
          $ref: '#/definitions/EnumFromArray',
        },
        nullableEnumFromArray: {
          oneOf: [{ $ref: '#/definitions/EnumFromArray' }, { type: 'null' }],
        },
        nullableNamedEnum: {
          oneOf: [{ $ref: '#/definitions/NamedEnum' }, { type: 'null' }],
        },
        namedStringType: {
          $ref: '#/definitions/NamedStringType',
        },
        union: {
          oneOf: [{ type: 'number' }, { $ref: '#/definitions/EnumFromArray' }],
        },
        nullableUnion: {
          oneOf: [
            { type: 'number' },
            { $ref: '#/definitions/EnumFromArray' },
            { type: 'null' },
          ],
        },
      },
      required: [
        'namedEnum',
        'enumFromArray',
        'namedStringType',
        'union',
      ].sort(),
      type: 'object',
    });

    expect(openApiSchema).toStrictEqual({
      properties: {
        namedEnum: {
          $ref: '#/components/schemas/NamedEnum',
        },
        enumFromArray: {
          $ref: '#/components/schemas/EnumFromArray',
        },
        nullableEnumFromArray: {
          allOf: [
            {
              $ref: '#/components/schemas/EnumFromArray',
            },
          ],
          nullable: true,
        },
        nullableNamedEnum: {
          allOf: [
            {
              $ref: '#/components/schemas/NamedEnum',
            },
          ],
          nullable: true,
        },
        namedStringType: {
          $ref: '#/components/schemas/NamedStringType',
        },
        union: {
          oneOf: [
            { type: 'number' },
            { $ref: '#/components/schemas/EnumFromArray' },
          ],
        },
        nullableUnion: {
          oneOf: [
            { type: 'number' },
            { $ref: '#/components/schemas/EnumFromArray' },
          ],
          nullable: true,
        },
      },
      required: [
        'namedEnum',
        'enumFromArray',
        'namedStringType',
        'union',
      ].sort(),
      type: 'object',
    });

    expect(openApiDefinitions).toStrictEqual({
      NamedEnum: {
        enum: ['a', 'b', 'c'],
        type: 'string',
      },
      EnumFromArray: {
        enum: ['a', 'b', 'c'],
        type: 'string',
      },
      NamedStringType: {
        type: 'string',
      },
    });
  });
});

type A = {
  a: string;
};

type B = {
  b: number;
  one: string;
  two: string;
};

type C = {
  c: string | number;
};

type BaseTypes = {
  // never: never;
  // null: null;
  // undefined: undefined;
  unknown: unknown;
  any: any;
  string: string;
  number: number;
  boolean: boolean;
  true: true;
  false: false;
  stringLiteral: 'string literal';
  numberLiteral: 1;
};

enum EnumType {
  Red,
  Green,
  Blue,
}

type AnyNullableType = any | undefined;
type NumberNullableType = number | undefined;
type StringNullableType = string | undefined;
type ArrayType = string[];
type ArrayNullableType = string[] | undefined;
type EnumNullableType = EnumType | undefined;
type UnionType = string | number;
type UnionNullableType = string | number | undefined;
type UnionType2 = 'a' | 'b' | 'c' | 'd';
type UnionType3 = 0 | 1 | 2 | 3;
type UnionType4 = 0 | 1 | 2 | 3 | 'a' | 'b' | 'c' | 'd';
type UnionType4Nullable = 0 | 1 | 2 | 3 | 'a' | 'b' | 'c' | 'd' | undefined;
type ObjectType = {
  foo: string;
  bar: number;
};
type ObjectNullableType =
  | {
      foo: string;
      bar: number;
    }
  | undefined;
type IntersectionType = A & B & C;
type IntersectionNullableType = (A & B & C) | undefined;
type IntersectionAndUnionType = A & (B | C);
type IntersectionAndUnionNullableType = (A & (B | C)) | undefined;
type OmitType = Omit<B, 'one'>;
type OmitNullableType = Omit<B, 'one'> | undefined;
type ExcludeType = Exclude<'a' | 'b' | 'c' | 'd', 'a'>;
type ExcludeNullableType = Exclude<'a' | 'b' | 'c' | 'd', 'a'> | undefined;
type PartialNullableType = Partial<B> | undefined;
type PickType = Pick<B, 'one'>;
type PickNullableType = Pick<B, 'one'> | undefined;
type RecordType = Record<string, string>;
type RecordNullableType = Record<string, string> | undefined;
type RecordType2 = Record<keyof B, string>;
type RecordType3 = {
  [K in keyof B]: string;
};
type RecordType4 = {
  [key: string]: {
    foo: string;
    bar: number;
  };
};

type RecursiveType = {
  parent?: RecursiveType;
  children: RecursiveType[];
};

type ObjectWithNullableRefs = {
  a?: A;
  c: C;
};

type NamedEnum = 'a' | 'b' | 'c';
const enumValues = ['a', 'b', 'c'] as const;
type EnumFromArray = typeof enumValues[number];

type NamedStringType = string;

type NamedEnums = {
  namedEnum: NamedEnum;
  enumFromArray: EnumFromArray;
  nullableEnumFromArray?: EnumFromArray;
  nullableNamedEnum?: NamedEnum;
  namedStringType: NamedStringType;
  union: number | EnumFromArray;
  nullableUnion?: number | EnumFromArray;
};
