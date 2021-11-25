import {
  CallExpression,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  ts,
  Type,
} from 'ts-morph';
import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { isReferenceObject, TsToOpenApiTypeParser } from './type_parser';
import { extractJsDocTags } from './jsdoc';
import { Route } from './route';
import { filterNonValidAndEmptyProperties, getPathParams } from './utils';
import { InvalidParamsType, RouteValidationError } from '.';

export const filePathAndLineNumberOfTypeDeclaration = (
  nodeType: Type<ts.Type>
) => {
  const declaration = nodeType.getSymbol()?.getDeclarations().at(0);

  return `${declaration
    ?.getSourceFile()
    .getFilePath()}:${declaration?.getStartLineNumber()}`;
};

const validateParamsType = (paramsNodeType: Type<ts.Type>) => {
  if (!paramsNodeType.isObject()) {
    throw new InvalidParamsType('Params should be an object');
  }

  const properties = paramsNodeType
    .getProperties()
    .map((property) => property.getEscapedName());

  const allowedProperties = [
    'method',
    'path',
    'pathParams',
    'requestQuery',
    'requestBody',
    'responseBody',
  ];
  const allowedPropertiesSet = new Set(allowedProperties);

  properties.forEach((property) => {
    if (!allowedPropertiesSet.has(property)) {
      throw new InvalidParamsType(
        `"${property}" is not valid property. It must be equal to one of the following: ${allowedProperties.join(
          ', '
        )}, at: ${filePathAndLineNumberOfTypeDeclaration(paramsNodeType)}`
      );
    }
  });
};

const validatePathParamProperty = (
  propertyName: string,
  propertySchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  parser: TsToOpenApiTypeParser,
  canBeArray: boolean
): void => {
  if (isReferenceObject(propertySchema)) {
    propertySchema = parser.resolveReferencedSchema(propertySchema);
  }

  if (propertySchema.oneOf) {
    propertySchema.oneOf.forEach((subSchema) =>
      validatePathParamProperty(propertyName, subSchema, parser, canBeArray)
    );
  } else if (
    propertySchema.type &&
    ['string', 'boolean', 'number'].includes(propertySchema.type)
  ) {
    return;
  } else if (propertySchema.enum) {
    return;
  } else if (canBeArray && propertySchema.type === 'array') {
    return validatePathParamProperty(
      propertyName,
      propertySchema.items,
      parser,
      false
    );
  }

  throw new Error(
    `Invalid path params property type for ${propertyName}, at: ${parser.filePathAndLineNumberOfParentNode()}`
  );
};

export const validateRequestQuery = (parser: TsToOpenApiTypeParser) => {
  Object.entries(parser.resolveRootProperties()).forEach(
    ([propertyName, propertySchema]) => {
      validatePathParamProperty(propertyName, propertySchema, parser, true);
    }
  );
};

export const validatePathParams = (
  path: string,
  parser: TsToOpenApiTypeParser
) => {
  Object.entries(parser.resolveRootProperties()).forEach(
    ([propertyName, propertySchema]) => {
      validatePathParamProperty(propertyName, propertySchema, parser, false);
    }
  );

  const paramsFromPath = getPathParams(path);
  const pathParamsFromSchema = parser.resolveRootProperties();

  if (
    !['object', 'allOf'].includes(
      parser.resolveReferencedSchema(parser.openApiSchema()).type || ''
    )
  ) {
    throw new InvalidParamsType(
      `Path params should be an object, at: ${parser.filePathAndLineNumberOfParentNode()}`
    );
  }

  paramsFromPath.forEach((param) => {
    const type = pathParamsFromSchema[param.name];

    if (type) {
      if (param.optional && !type.nullable) {
        throw new InvalidParamsType(
          `Path param  ${
            param.name
          } should be nullable, at: ${parser.filePathAndLineNumberOfParentNode()}`
        );
      } else if (!param.optional && type.nullable) {
        throw new InvalidParamsType(
          `Path param  ${
            param.name
          } should not be nullable, at: ${parser.filePathAndLineNumberOfParentNode()}`
        );
      }
    }
  });

  const additionalParams = _.difference(
    Object.keys(pathParamsFromSchema),
    paramsFromPath.map((param) => param.name)
  );

  if (additionalParams.length > 0) {
    throw new InvalidParamsType(
      `Additional path params have been provided: ${additionalParams.join(
        ', '
      )}, at: ${parser.filePathAndLineNumberOfParentNode()}`
    );
  }
};

const splitTagsString = (tags?: string): string[] | undefined => {
  return tags?.split(',').map((tag) => tag.trim());
};

const checkProgramForErrors = (tsConfigFilePath: string) => {
  const project = new Project({
    tsConfigFilePath: tsConfigFilePath,
  });

  const diagnostics = project.getPreEmitDiagnostics();

  if (diagnostics.length > 0) {
    throw new Error(project.formatDiagnosticsWithColorAndContext(diagnostics));
  }
};

const isImportedFromModule = (
  node: CallExpression,
  moduleName: string,
  importName: string
) => {
  return (
    node
      .getSourceFile()
      .getDescendantsOfKind(SyntaxKind.ImportSpecifier)
      .filter(
        (importSpecifier) =>
          importSpecifier
            .getImportDeclaration()
            .getModuleSpecifierValue()
            ?.toString() === moduleName &&
          importSpecifier.getName() === importName &&
          importSpecifier.getSymbol() === node.getExpression().getSymbol()
      )?.length > 0
  );
};

const getMethodAndClassName = (node: Node<ts.Node>) => {
  const propertyDeclaration = node.getParentIfKind(
    SyntaxKind.PropertyDeclaration
  );

  if (propertyDeclaration) {
    const classDeclaration = propertyDeclaration.getParentIfKindOrThrow(
      SyntaxKind.ClassDeclaration
    );

    const jsDocTags = extractJsDocTags(classDeclaration);

    const methodName = propertyDeclaration.getName();
    const className = classDeclaration.getNameOrThrow();

    if (!classDeclaration.isExported()) {
      throw new RouteValidationError(
        `Class ${className} needs to be exported, in ${classDeclaration
          .getSourceFile()
          .getFilePath()}:${classDeclaration.getStartLineNumber()}`
      );
    }

    const constructors = classDeclaration.getConstructors();

    if (
      constructors.length > 0 &&
      constructors.filter(
        (constructor) => constructor.getParameters().length === 0
      ).length === 0
    ) {
      throw new RouteValidationError(
        `No constructor without parameters for class ${className}, in ${classDeclaration
          .getSourceFile()
          .getFilePath()}:${classDeclaration.getStartLineNumber()}`
      );
    }

    return {
      methodName: methodName,
      className: className,
      jsDocTags: jsDocTags,
    };
  }
};

export const getSchemaFromCreateRoute = (
  callExpression: CallExpression
): Route => {
  const methodAndClassName = getMethodAndClassName(callExpression);

  const paramsNode = callExpression.getTypeArguments().at(0);

  if (!paramsNode) {
    throw new InvalidParamsType(
      `No type argument provided for ${
        methodAndClassName?.className && methodAndClassName.methodName
          ? methodAndClassName.className + '.' + methodAndClassName.methodName
          : callExpression.getText()
      } in: ${callExpression
        .getSourceFile()
        .getFilePath()}:${callExpression.getStartLineNumber(false)}`
    );
  }

  const paramsNodeType = paramsNode.getType();

  validateParamsType(paramsNodeType);

  const method = paramsNodeType
    .getPropertyOrThrow('method')
    .getTypeAtLocation(paramsNode)
    .getLiteralValueOrThrow()
    .toString();

  const route = paramsNodeType
    .getPropertyOrThrow('path')
    .getTypeAtLocation(paramsNode)
    .getLiteralValueOrThrow()
    .toString();

  const parseProperty = (nodeType: Type<ts.Type>, key: string) => {
    const node = nodeType.getProperty(key)?.getTypeAtLocation(paramsNode);

    if (node) {
      return new TsToOpenApiTypeParser({
        node: paramsNode,
        nodeType: node,
      });
    }
  };

  const pathParams = parseProperty(paramsNodeType, 'pathParams');
  const requestQuery = parseProperty(paramsNodeType, 'requestQuery');
  const requestBody = parseProperty(paramsNodeType, 'requestBody');
  const responseBody = parseProperty(paramsNodeType, 'responseBody');

  if (pathParams) {
    validatePathParams(route, pathParams);
  }

  if (requestQuery) {
    validateRequestQuery(requestQuery);
  }

  const { description, openapi_summary, openapi_tags, openapi_operationId } =
    extractJsDocTags(callExpression);

  const tags_ = splitTagsString(openapi_tags);

  return filterNonValidAndEmptyProperties({
    method: method,
    path: route,
    tags: tags_ || splitTagsString(methodAndClassName?.jsDocTags.openapi_tags),
    description: description,
    summary: openapi_summary,
    operationId: openapi_operationId,
    className: methodAndClassName?.className,
    methodName: methodAndClassName?.methodName,
    pathParams: pathParams,
    requestQuery: requestQuery,
    requestBody: requestBody,
    responseBody: responseBody,
    sourceFilePath: callExpression.getSourceFile().getFilePath(),
  }) as Route;
};

export const getRoutesFromTsFile = (sourceFile: SourceFile): Route[] => {
  return sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .map((callExpression) => {
      if (
        isImportedFromModule(
          callExpression,
          '@typed-rest-api/server',
          'createExpressRoute'
        )
      ) {
        return getSchemaFromCreateRoute(callExpression);
      } else if (
        isImportedFromModule(
          callExpression,
          '@typed-rest-api/server',
          'registerRoute'
        )
      ) {
        return getSchemaFromCreateRoute(callExpression);
      }
    })
    .filter(Boolean) as Route[];
};

export const getRoutes = (tsConfigFilePath: string): Route[] => {
  checkProgramForErrors(tsConfigFilePath);

  const project = new Project({
    tsConfigFilePath: tsConfigFilePath,
    compilerOptions: {
      // Strict is necessary for nullable properties
      strict: true,
    },
  });

  return project.getSourceFiles().flatMap(getRoutesFromTsFile);
};
