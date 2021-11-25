import { getPathParams, filterNonValidAndEmptyProperties } from 'typescript-routes-to-openapi/src/utils';

describe('utils', () => {
  test('filterNonValidAndEmptyProperties', () => {
    expect(filterNonValidAndEmptyProperties({ foo: 1 })).toEqual({ foo: 1 });

    expect(filterNonValidAndEmptyProperties({ foo: null })).toEqual({});

    expect(filterNonValidAndEmptyProperties({ foo: undefined })).toEqual({});

    expect(filterNonValidAndEmptyProperties({ foo: 1 })).toEqual({ foo: 1 });

    expect(filterNonValidAndEmptyProperties({ foo: [] })).toEqual({});

    expect(filterNonValidAndEmptyProperties({ foo: [1] })).toEqual({
      foo: [1],
    });

    expect(filterNonValidAndEmptyProperties({ foo: {} })).toEqual({});

    expect(filterNonValidAndEmptyProperties({ foo: { bar: 1 } })).toEqual({
      foo: { bar: 1 },
    });
  });

  test('getPathParams', () => {
    expect(getPathParams('/:foo/:bar/:foobar?')).toEqual([
      {
        name: 'foo',
        optional: false,
      },
      {
        name: 'bar',
        optional: false,
      },
      {
        name: 'foobar',
        optional: true,
      },
    ]);

    expect(getPathParams('/:foo-bar:foobar?')).toEqual([
      {
        name: 'foo',
        optional: false,
      },
      {
        name: 'foobar',
        optional: true,
      },
    ]);

    expect(getPathParams('/:foo.bar:foobar?')).toEqual([
      {
        name: 'foo',
        optional: false,
      },
      {
        name: 'foobar',
        optional: true,
      },
    ]);

    expect(getPathParams('/:foo~bar:foobar?')).toEqual([
      {
        name: 'foo',
        optional: false,
      },
      {
        name: 'foobar',
        optional: true,
      },
    ]);

    expect(getPathParams('/:foo/bar:foobar?')).toEqual([
      {
        name: 'foo',
        optional: false,
      },
      {
        name: 'foobar',
        optional: true,
      },
    ]);

    expect(getPathParams('/bar:foo?-bar:foobar')).toEqual([
      {
        name: 'foo',
        optional: true,
      },
      {
        name: 'foobar',
        optional: false,
      },
    ]);
  });
});
