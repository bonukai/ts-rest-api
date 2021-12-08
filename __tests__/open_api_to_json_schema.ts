import { openApiToJsonSchema } from '../src/type_parser';

describe('openApiToJsonSchema', () => {
  test('nullable', () => {
    expect(
      openApiToJsonSchema({
        type: 'string',
        nullable: true,
      })
    ).toStrictEqual({
      type: ['string', 'null'],
    });

    expect(
      openApiToJsonSchema({
        type: 'string',
        nullable: true,
        enum: ['a', 'b', null],
      })
    ).toStrictEqual({
      type: 'string',
      enum: ['a', 'b', null],
    });

    expect(
      openApiToJsonSchema({
        type: 'object',
        properties: {
          foo: { type: 'string', nullable: true },
        },
        nullable: true,
      })
    ).toStrictEqual({
      type: ['object', 'null'],
      properties: {
        foo: { type: ['string', 'null'] },
      },
    });
  });

  test('nullable oneOf', () => {
    expect(
      openApiToJsonSchema({
        oneOf: [{ type: 'string' }, { type: 'number' }],
        nullable: true,
      })
    ).toStrictEqual({
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }],
    });
  });

  test('nullable allOf', () => {
    expect(
      openApiToJsonSchema({
        allOf: [
          { type: 'object', properties: { foo: { type: 'string' } } },
          { type: 'object', properties: { bar: { type: 'string' } } },
        ],
        nullable: true,
      })
    ).toStrictEqual({
      oneOf: [
        {
          allOf: [
            { type: 'object', properties: { foo: { type: 'string' } } },
            { type: 'object', properties: { bar: { type: 'string' } } },
          ],
        },
        { type: 'null' },
      ],
    });
  });

  test('example', () => {
    expect(
      openApiToJsonSchema({
        type: 'string',
        example: 'foo',
      })
    ).toStrictEqual({
      type: 'string',
      examples: ['foo'],
    });
  });

  test('ref', () => {
    expect(
      openApiToJsonSchema({
        $ref: '#/components/schemas/Foo',
      })
    ).toStrictEqual({
      $ref: '#/definitions/Foo',
    });

    expect(
      openApiToJsonSchema({
        type: 'object',
        properties: {
          parent: {
            $ref: '#/components/schemas/Bar',
          },
          children: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Bar',
            },
          },
        },
      })
    ).toStrictEqual({
      type: 'object',
      properties: {
        parent: {
          $ref: '#/definitions/Bar',
        },
        children: {
          type: 'array',
          items: {
            $ref: '#/definitions/Bar',
          },
        },
      },
    });
  });

  test('enum', () => {
    expect(
      openApiToJsonSchema({
        enum: ['a', 'b', 'c', null],
        type: 'string',
        nullable: true,
      })
    ).toStrictEqual({
      enum: ['a', 'b', 'c', null],
      type: 'string',
    });
  });
});
