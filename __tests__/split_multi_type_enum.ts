import { splitMultiTypeEnum } from '../src/generators/routes';

describe('splitMultiTypeEnum', () => {
  test('simple', () => {
    expect(
      splitMultiTypeEnum({
        enum: ['foo', 'bar', 1, 2, 3, true],
      })
    ).toStrictEqual({
      oneOf: [
        {
          type: 'string',
          enum: ['foo', 'bar'],
        },
        {
          type: 'number',
          enum: [1, 2, 3],
        },
        {
          type: 'boolean',
          enum: [true],
        },
      ],
    });
  });

  test('nullable', () => {
    expect(
      splitMultiTypeEnum({
        enum: ['string', 1, true, null],
        nullable: true,
      })
    ).toStrictEqual({
      oneOf: [
        {
          type: 'string',
          enum: ['string'],
        },
        {
          type: 'number',
          enum: [1],
        },
        {
          type: 'boolean',
          enum: [true],
        },
        {
          type: 'null',
        },
      ],
    });
  });

  test('nullable string', () => {
    expect(
      splitMultiTypeEnum({
        type: 'object',
        properties: {
          enum: {
            type: 'string',
            enum: ['a', 'b', 'c', null],
            nullable: true,
          },
        },
      })
    ).toStrictEqual({
      type: 'object',
      properties: {
        enum: {
          type: 'string',
          enum: ['a', 'b', 'c', null],
          nullable: true,
        },
      },
    });
  });
});
