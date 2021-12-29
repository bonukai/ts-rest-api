import type { RequestHandler } from 'express';
import type { ErrorObject } from 'ajv';

type PathParamType = string | number | boolean;

type JoinObject<Base extends object, Param extends string> = {
  [T in keyof Base]: Base[T];
} & (Param extends `${infer Param}?`
  ? { [T in Param]?: PathParamType }
  : { [T in Param]: PathParamType }) extends infer Res
  ? {
      [T in keyof Res]: Res[T];
    }
  : never;

type StopCharacters = ['-', '.', '~', '/', '\\', ':'];

type OmitFirstArrayElement<Elements extends ReadonlyArray<any>> =
  Elements extends [any, ...infer Rest] ? Rest : [];

type StripString<
  Path extends string,
  StopCharacter extends string
> = Path extends `${infer A}${StopCharacter}${string}` ? A : Path;

type StripPath<
  Path extends string,
  StopCharacters extends ReadonlyArray<string>
> = StopCharacters extends []
  ? Path
  : StripPath<
      StripString<Path, StopCharacters[0]>,
      OmitFirstArrayElement<StopCharacters>
    >;

type _PathParams<
  Path extends string,
  Result extends Record<string, string> = {}
> = Path extends `${string}:${infer Rest}`
  ? Rest extends `${StripPath<Rest, StopCharacters>}${infer Rest2}`
    ? _PathParams<Rest2, JoinObject<Result, StripPath<Rest, StopCharacters>>>
    : JoinObject<Result, Rest>
  : Result;

export type PathParams<Path extends string> = _PathParams<Path>;

type PropertyTypeOrDefault<
  T extends object,
  Key extends keyof T,
  Default
> = T extends {
  [P in Key]: infer Result;
}
  ? Result
  : Default;

type ExpressMethod =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch'
  | 'trace';

type RequestQueryType = Record<
  string,
  PathParamType | Array<PathParamType> | undefined
>;


export function createExpressRoute<
T extends {
  method: ExpressMethod;
  path: string;
  pathParams?: PathParams<
    PropertyTypeOrDefault<T, 'path', Record<string, PathParamType>>
  >;
  requestQuery?: RequestQueryType;
  requestBody?: any;
  responseBody?: any;
}
>(
handler: RequestHandler<
  PropertyTypeOrDefault<T, 'pathParams', Record<string, string>>,
  PropertyTypeOrDefault<T, 'responseBody', any>,
  PropertyTypeOrDefault<T, 'requestBody', any>,
  PropertyTypeOrDefault<T, 'requestQuery', any>
>
): RequestHandler;

export function createExpressRoute<
T extends {
  method: ExpressMethod;
  path: string;
  pathParams?: PathParams<
    PropertyTypeOrDefault<T, 'path', Record<string, PathParamType>>
  >;
  requestQuery?: RequestQueryType;
  requestBody?: any;
  responseBody?: any;
}
>(
...handlers: RequestHandler<
  PropertyTypeOrDefault<T, 'pathParams', Record<string, string>>,
  PropertyTypeOrDefault<T, 'responseBody', any>,
  PropertyTypeOrDefault<T, 'requestBody', any>,
  PropertyTypeOrDefault<T, 'requestQuery', any>
>[]
): RequestHandler[];

export function createExpressRoute<
T extends {
  method: ExpressMethod;
  path: string;
  pathParams?: PathParams<
    PropertyTypeOrDefault<T, 'path', Record<string, PathParamType>>
  >;
  requestQuery?: RequestQueryType;
  requestBody?: any;
  responseBody?: any;
}
>(
arg: any
): any {
  {
    return arg;
  };
}

export const registerRoute = <
  T extends {
    method: ExpressMethod;
    path: string;
    pathParams?: PathParams<
      PropertyTypeOrDefault<T, 'path', Record<string, PathParamType>>
    >;
    requestQuery?: RequestQueryType;
    requestBody?: any;
    responseBody?: any;
  }
>() => {
  return function (target: any, propertyKey: string, descriptor: any) {
    return {};
  };
};

export class ValidationError extends Error {
  readonly statusCode;
  readonly errors;

  constructor(errors: ErrorObject[], errorMessage: string) {
    super();
    this.name = this.constructor.name;
    this.statusCode = 400;
    this.message = errorMessage;
    this.errors = errors;
  }
}
