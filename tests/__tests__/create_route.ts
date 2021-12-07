import { Project, SyntaxKind } from 'ts-morph';
import { createExpressRoute } from 'typescript-routes-to-openapi/server';
import { getSchemaFromCreateRoute } from 'typescript-routes-to-openapi/src/find_routes';
import { InvalidParamsType, RouteValidationError } from 'typescript-routes-to-openapi/src/index';

const project = new Project({ compilerOptions: { strict: true } });
const sourceFile = project.addSourceFileAtPath(__filename);

const getMethod = (className: string, methodName: string) => {
  const res = sourceFile
    .getDescendantsOfKind(SyntaxKind.ClassDeclaration)
    .find((node) => node.getSymbol()?.getName() === className)
    ?.getDescendantsOfKind(SyntaxKind.CallExpression)
    .find(
      (node) =>
        node.getParentIfKind(SyntaxKind.PropertyDeclaration)?.getName() ===
        methodName
    );

  if (!res) {
    throw new Error(`Unable to find method ${className}.${methodName}`);
  }

  return res;
};

const createTest = (args: {
  testDescription: string;
  className: string;
  methodName: string;
  expectedError: new (message?: string) => void;
}) => {
  test(args.testDescription, () => {
    const method = getMethod(args.className, args.methodName);

    expect(() => getSchemaFromCreateRoute(method)).toThrow(
      args.expectedError
    );
  });
};

describe('create route', () => {
  createTest({
    testDescription: 'no class export',
    className: 'UserControllerNoExport',
    methodName: 'users',
    expectedError: RouteValidationError,
  });

  createTest({
    testDescription: 'no type arguments',
    className: 'UserController',
    methodName: 'noTypeArguments',
    expectedError: InvalidParamsType,
  });

  createTest({
    testDescription: 'extra type arguments',
    className: 'UserController',
    methodName: 'extraArguments',
    expectedError: InvalidParamsType,
  });

  createTest({
    testDescription: 'invalid path param type',
    className: 'UserController',
    methodName: 'invalidPathParam',
    expectedError: InvalidParamsType,
  });

  createTest({
    testDescription: 'invalid path param type 2',
    className: 'UserController',
    methodName: 'invalidPathParam2',
    expectedError: InvalidParamsType,
  });

  test('pathParamsIntersection', () => {
    const method = getMethod('UserController', 'pathParamsIntersection');

    expect(() => getSchemaFromCreateRoute(method)).toBeDefined();
  });
});

class UserControllerNoExport {
  users = createExpressRoute<{
    path: '/users';
    method: 'get';
  }>((req, res) => {});
}

export class UserController {
  noTypeArguments = createExpressRoute((req, res) => {});

  extraArguments = createExpressRoute<{
    method: 'get';
    path: '/foo';
    extraArgument: any;
  }>((req, res) => {});

  invalidPathParam = createExpressRoute<{
    method: 'get';
    path: '/foo';
    pathParams: string;
  }>((req, res) => {});

  invalidPathParam2 = createExpressRoute<{
    method: 'get';
    path: '/foo';
    pathParams: {
      foo: string;
    };
  }>((req, res) => {});

  pathParamsIntersection = createExpressRoute<{
    method: 'get';
    path: '/:foo/:bar';
    pathParams: { foo: string } & { bar: string };
  }>((req, res) => {});
}
