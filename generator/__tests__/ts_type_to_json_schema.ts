import { tsTypeToJsonSchema } from '../src/type_parser';

describe('tsTypeToJsonSchema', () => {
  test('top ref', () => {
    expect(
      JSON.parse(
        tsTypeToJsonSchema({
          file: __filename,
          type: 'Foo',
        })
      )
    ).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      definitions: {
        Foo: {
          type: 'object',
          properties: {
            one: { type: 'string' },
            two: { type: 'number' },
          },
          required: ['one', 'two'],
        },
      },
      $ref: '#/definitions/Foo',
    });
  });

  test('no top ref', () => {
    expect(
      JSON.parse(
        tsTypeToJsonSchema({
          file: __filename,
          type: 'Foo',
          noTopRef: true,
        })
      )
    ).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: {
        one: { type: 'string' },
        two: { type: 'number' },
      },
      required: ['one', 'two'],
    });
  });

  test('UnExportedType', () => {
    expect(
      JSON.parse(
        tsTypeToJsonSchema({
          file: __filename,
          type: 'UnExportedType',
          noTopRef: true,
        })
      )
    ).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
      enum: ['a', 'b'],
    });
  });
});

export type Foo = {
  one: string;
  two: number;
};

type UnExportedType = 'a' | 'b';
