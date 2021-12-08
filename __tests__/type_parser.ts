import { OpenAPIV3 } from 'openapi-types';
import { Project } from 'ts-morph';
import {
  isReferenceObject,
  TsToOpenApiTypeParser,
} from '../src/type_parser';

const project = new Project({ compilerOptions: { strict: true } });
const sourceFile = project.addSourceFileAtPath(__filename);
const testTypeNode = sourceFile
  .forEachChildAsArray()
  .find((node) => node.getType().getText() === 'TestType')!;

const testType2Node = sourceFile
  .forEachChildAsArray()
  .find((node) => node.getType().getText() === 'TestType2')!;

const testType3Node = sourceFile
  .forEachChildAsArray()
  .find((node) => node.getType().getText() === 'TestType3')!;

describe('tsTypeToJsonSchema', () => {
  test('No top ref', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testTypeNode,
      noTopRef: true,
    });

    expect(parser.jsonSchema()).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Bar: {
          type: 'object',
          properties: {
            bar: { type: 'number' },
          },
          required: ['bar'],
        },
        Foo: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
          required: ['foo'],
        },
      },
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: ['string', 'null'] },
        three: { type: ['string', 'null'] },
        foo: { $ref: '#/definitions/Foo' },
        bar: { $ref: '#/definitions/Bar' },
      },
      required: ['bar', 'foo', 'one'],
    });

    expect(parser.openApiSchema()).toStrictEqual({
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'string', nullable: true },
        three: { type: 'string', nullable: true },
        foo: { $ref: '#/components/schemas/Foo' },
        bar: { $ref: '#/components/schemas/Bar' },
      },
      required: ['bar', 'foo', 'one'],
    });

    expect(parser.openApiDefinitions()).toStrictEqual({
      Bar: {
        type: 'object',
        properties: {
          bar: { type: 'number' },
        },
        required: ['bar'],
      },
      Foo: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
        required: ['foo'],
      },
    });
  });

  test('Top ref', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testTypeNode,
      noTopRef: false,
    });

    expect(parser.jsonSchema()).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Bar: {
          type: 'object',
          properties: {
            bar: { type: 'number' },
          },
          required: ['bar'],
        },
        Foo: {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
          required: ['foo'],
        },
        TestType: {
          type: 'object',
          properties: {
            one: { type: 'string' },
            two: { type: ['string', 'null'] },
            three: { type: ['string', 'null'] },
            foo: { $ref: '#/definitions/Foo' },
            bar: { $ref: '#/definitions/Bar' },
          },
          required: ['bar', 'foo', 'one'],
        },
      },
      $ref: '#/definitions/TestType',
    });

    expect(parser.openApiSchema()).toStrictEqual({
      $ref: '#/components/schemas/TestType',
    });

    expect(parser.openApiDefinitions()).toStrictEqual({
      TestType: {
        type: 'object',
        properties: {
          one: { type: 'string' },
          two: { type: 'string', nullable: true },
          three: { type: 'string', nullable: true },
          foo: { $ref: '#/components/schemas/Foo' },
          bar: { $ref: '#/components/schemas/Bar' },
        },
        required: ['bar', 'foo', 'one'],
      },
      Bar: {
        type: 'object',
        properties: {
          bar: { type: 'number' },
        },
        required: ['bar'],
      },
      Foo: {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
        required: ['foo'],
      },
    });
  });

  test('getAllRootProperties', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testType2Node,
      noTopRef: false,
    });

    expect(parser.getAllRootProperties()).toStrictEqual({
      one: { type: 'string' },
      foo: { type: 'string' },
      bar: { type: 'number' },
      two: { type: 'string', nullable: true },
      three: { $ref: '#/components/schemas/There' },
    });
  });

  test('resolveRootProperties', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testType2Node,
      noTopRef: false,
    });

    expect(parser.resolveRootProperties()).toStrictEqual({
      one: { type: 'string' },
      foo: { type: 'string' },
      bar: { type: 'number' },
      two: { type: 'string', nullable: true },
      three: { type: 'string', enum: ['a', 'b', 'c'] },
    });
  });

  test('resolveReferencedSchema', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testType2Node,
      noTopRef: false,
    });

    expect(
      parser.resolveReferencedSchema({ $ref: '#/components/schemas/There' })
    ).toStrictEqual({
      type: 'string',
      enum: ['a', 'b', 'c'],
    });

    expect(
      parser.resolveReferencedSchema({ $ref: '#/components/schemas/Foo' })
    ).toStrictEqual({
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      required: ['foo'],
    });

    expect(
      parser.resolveReferencedSchema({ $ref: '#/components/schemas/Bar' })
    ).toStrictEqual({
      type: 'object',
      properties: {
        bar: { type: 'number' },
      },
      required: ['bar'],
    });
  });

  test('isReferenceObject', () => {
    expect(
      isReferenceObject({
        $ref: '#/components/schemas/Bar',
      })
    ).toBeTruthy();

    expect(
      isReferenceObject({
        $ref: null,
      } as unknown as OpenAPIV3.ReferenceObject)
    ).toBeFalsy();

    expect(
      isReferenceObject({
        $ref: undefined,
      } as unknown as OpenAPIV3.ReferenceObject)
    ).toBeFalsy();

    expect(
      isReferenceObject({
        type: 'object',
      })
    ).toBeFalsy();

    expect(isReferenceObject({})).toBeFalsy();
  });

  test('comments', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testType3Node,
      noTopRef: false,
    });

    expect(parser.jsonSchema()).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        TestType3: {
          type: 'object',
          properties: {
            one: {
              description: 'description 1',
              examples: ['example 1'],
              type: 'string',
            },
            fooBar: {
              $ref: '#/definitions/FooBar',
            },
          },
          required: ['fooBar', 'one'],
        },
        FooBar: {
          type: 'object',
          properties: {
            one: {
              description: 'description 2',
              examples: ['example 2'],
              type: 'string',
            },
            two: {
              type: 'object',
              properties: {
                one: {
                  description: 'description 3',
                  examples: ['example 3'],
                  type: 'string',
                },
              },
              required: ['one'],
            },
          },
          required: ['one', 'two'],
        },
      },
      $ref: '#/definitions/TestType3',
    });

    expect(parser.openApiSchema()).toStrictEqual({
      $ref: '#/components/schemas/TestType3',
    });

    expect(parser.openApiDefinitions()).toStrictEqual({
      TestType3: {
        type: 'object',
        properties: {
          one: {
            description: 'description 1',
            example: 'example 1',
            type: 'string',
          },
          fooBar: {
            $ref: '#/components/schemas/FooBar',
          },
        },
        required: ['fooBar', 'one'],
      },
      FooBar: {
        type: 'object',
        properties: {
          one: {
            description: 'description 2',
            example: 'example 2',
            type: 'string',
          },
          two: {
            type: 'object',
            properties: {
              one: {
                description: 'description 3',
                example: 'example 3',
                type: 'string',
              },
            },
            required: ['one'],
          },
        },
        required: ['one', 'two'],
      },
    });
  });

  test('getRootJsDocTag', () => {
    const parser = new TsToOpenApiTypeParser({
      node: testType3Node,
    });

    expect(parser.getRootJsDocTag('foo')).toStrictEqual('foo');
    expect(parser.getRootJsDocTag('bar')).toStrictEqual('bar');
    expect(parser.getRootJsDocTag('foobar')).toStrictEqual('foobar');
  });
});

type Foo = {
  foo: string;
};

interface Bar {
  bar: number;
}

type There = 'a' | 'b' | 'c';

type TestType = {
  one: string;
  two?: string;
  three?: string;
  foo: Foo;
  bar: Bar;
};

type TestType2 = {
  one: string;
  two?: string;
  three: There;
} & Foo &
  Bar;

type FooBar = {
  /**
   * @example example 2
   * @description description 2
   */
  one: string;
  two: {
    /**
     * @example example 3
     * @description description 3
     * @operationId three
     */
    one: string;
  };
};

/**
 * @foo foo
 * @bar bar
 * @foobar foobar
 */
type TestType3 = {
  /**
   * @example example 1
   * @description description 1
   */
  one: string;
  fooBar: FooBar;
};
