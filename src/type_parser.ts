import { JSONSchema7 } from 'json-schema';
import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import { Node, Project, Symbol, ts, Type, SyntaxKind } from 'ts-morph';
import { extractJsDocTags } from './jsdoc';
import { filterNonValidAndEmptyProperties, visitOpenApiSchema } from './utils';

export const isReferenceObject = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): schema is OpenAPIV3.ReferenceObject => {
  return '$ref' in schema && typeof schema.$ref === 'string';
};

export const openApiToJsonSchema = (
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): JSONSchema7 => {
  const res = _.cloneDeep(schema);

  visitOpenApiSchema(res, (schema) => {
    if (isReferenceObject(schema)) {
      if (!schema.$ref.startsWith('#/components/schemas/')) {
        throw new Error(`Invalid $ref: ${schema.$ref}`);
      }

      schema.$ref = schema.$ref.replace(
        '#/components/schemas/',
        '#/definitions/'
      );
    }
  });

  visitOpenApiSchema(res, (schema) => {
    if (!isReferenceObject(schema)) {
      if (schema.nullable) {
        if (
          typeof schema.type === 'string' &&
          typeof schema.enum === 'undefined'
        ) {
          (<JSONSchema7>schema).type = [schema.type, 'null'];
        } else if (schema.oneOf) {
          (<JSONSchema7>schema).oneOf!.push({ type: 'null' });
        } else if (schema.allOf) {
          if (schema.allOf.length === 1) {
            (<JSONSchema7>schema).oneOf = [
              schema.allOf[0] as JSONSchema7,
              { type: 'null' },
            ];
          } else {
            (<JSONSchema7>schema).oneOf = [
              {
                allOf: schema.allOf as JSONSchema7[],
              },
              { type: 'null' },
            ];
          }
          delete schema.allOf;
        }

        delete schema.nullable;
      }

      if (schema.example) {
        (<JSONSchema7>schema).examples = [schema.example];
        delete schema.example;
      }
    }
  });

  return res as JSONSchema7;
};

export class TsToOpenApiTypeParser {
  private readonly nodeType: Type<ts.Type>;
  private readonly parentNode: Node<ts.Node>;
  private readonly noTopRef;
  private readonly rootJsDocTags: Record<string, string>;

  private readonly _definitions = new Map<
    string,
    OpenAPIV3.SchemaObject | null
  >();
  private readonly _schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

  constructor(args: {
    node: Node<ts.Node>;
    nodeType?: Type<ts.Type>;
    noTopRef?: boolean;
  }) {
    this.parentNode = args.node;
    this.nodeType = args.nodeType ? args.nodeType : this.parentNode.getType();
    this.noTopRef = args.noTopRef || false;

    this._schema = this.tsTypeToJsonSchema(this.nodeType, undefined, true);

    this.rootJsDocTags = this.nodeType.getAliasSymbol()
      ? extractJsDocTags(this.nodeType.getAliasSymbol())
      : extractJsDocTags(this.nodeType, this.parentNode);
  }

  public filePathAndLineNumberOfParentNode() {
    return `${this.parentNode
      .getSourceFile()
      .getFilePath()}:${this.parentNode.getStartLineNumber()}`;
  }

  public filePathAndLineNumberOfDeclaration(nodeType: Type<ts.Type>) {
    const declaration =
      nodeType.getAliasSymbol()?.getDeclarations().at(0) ||
      nodeType.getSymbol()?.getDeclarations().at(0);

    if (!declaration) {
      return this.filePathAndLineNumberOfParentNode();
    }

    return `${declaration
      .getSourceFile()
      .getFilePath()}:${declaration.getStartLineNumber()}`;
  }

  public resolveReferencedSchema(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  ) {
    return this._resolveReferencedSchema(schema);
  }

  private _resolveReferencedSchema(
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
  ): OpenAPIV3.SchemaObject {
    if (!isReferenceObject(schema)) {
      return schema;
    }

    const objectName = schema.$ref.split('/').slice(-1).at(0);

    if (!objectName) {
      throw new Error(`Invalid $ref: ${schema.$ref}`);
    }

    const object = this._definitions.get(objectName);

    if (!object) {
      throw new Error(`Invalid $ref: ${schema.$ref}`);
    }

    if (isReferenceObject(object)) {
      return this._resolveReferencedSchema(schema);
    }

    return object;
  }

  public openApiDefinitions() {
    return Object.fromEntries(this._definitions) as Record<
      string,
      OpenAPIV3.SchemaObject
    >;
  }

  public openApiSchema(): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return _.cloneDeep(this._schema);
  }

  public getRootJsDocTag(tagName: string): string | undefined {
    return this.rootJsDocTags[tagName];
  }

  public jsonSchema(): JSONSchema7 {
    const res = openApiToJsonSchema(this._schema);

    if (this._definitions.size > 0) {
      return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        definitions: _.mapValues(
          Object.fromEntries(this._definitions),
          openApiToJsonSchema
        ),
        ...res,
      };
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      ...res,
    };
  }

  private tsLiteralTypeToJsonSchema(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (nodeType.isStringLiteral()) {
      return {
        type: 'string',
        enum: [nodeType.getLiteralValueOrThrow().toString()],
      };
    } else if (nodeType.isBooleanLiteral()) {
      if (nodeType.getText() !== 'true' && nodeType.getText() !== 'false') {
        throw new Error(`${nodeType.getText()} should be true or false`);
      }
      return {
        type: 'boolean',
        enum: [nodeType.getText() === 'true' ? true : false],
      };
    } else if (nodeType.isEnumLiteral()) {
      return {
        type: 'string',
        enum: [nodeType.getLiteralValueOrThrow().toString()],
      };
    } else if (nodeType.isNumberLiteral()) {
      return {
        type: 'number',
        enum: [Number(nodeType.getLiteralValueOrThrow())],
      };
    } else if (nodeType.isLiteral()) {
      return {
        type: 'string',
        enum: [nodeType.getLiteralValueOrThrow().toString()],
      };
    }

    throw new Error(
      `${nodeType.getText()} should be literal type, at: ${this.filePathAndLineNumberOfDeclaration(
        nodeType
      )}`
    );
  }

  private tsNullableTypeToJsonSchema(
    nodeType: Type<ts.Type>,
    currentDefinition: string | undefined = undefined,
    isRoot: boolean | undefined = false
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    const res = this.tsTypeToJsonSchema(
      nodeType.getNonNullableType(),
      undefined,
      isRoot
    );

    if (isReferenceObject(res)) {
      return {
        allOf: [res],
        nullable: true,
      };
    }

    if (!isReferenceObject(res) && res.enum) {
      res.enum.push(null);
    }

    return {
      ...res,
      nullable: true,
    };
  }

  private tsEnumTypeToJsonSchema(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return {
      type: 'string',
      enum: this.parentNode
        .getSourceFile()
        .getEnumOrThrow(nodeType.getText())
        .getMembers()
        .map((member) => member.getText())
        .sort(),
    };
  }

  private tsIntersectionTypeToJsonSchema(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return {
      allOf: nodeType.getIntersectionTypes().map((child) => {
        return this.tsTypeToJsonSchema(child);
      }),
    };
  }

  private tsArrayTypeToJsonSchema(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    return {
      type: 'array',
      items: this.tsTypeToJsonSchema(nodeType.getArrayElementTypeOrThrow()),
    };
  }

  private shouldHandleRef = (
    nodeType: Type<ts.Type>,
    currentDefinition: string | undefined = undefined,
    isRoot: boolean | undefined = false
  ): boolean => {
    const typeName = getTypeName(nodeType, this.parentNode);

    if (
      (this.noTopRef === true && isRoot === false) ||
      this.noTopRef === false
    ) {
      return typeof typeName === 'string' && typeName !== currentDefinition;
    }

    return false;
  };

  private tsRefTypeToJsonSchema(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.ReferenceObject {
    const typeName = getTypeName(nodeType, this.parentNode)!;

    if (!this._definitions.has(typeName)) {
      this._definitions.set(typeName, null);
      this._definitions.set(
        typeName,
        this.tsTypeToJsonSchema(nodeType, typeName) as OpenAPIV3.SchemaObject
      );
      return {
        $ref: `#/components/schemas/${typeName}`,
      };
    } else {
      return {
        $ref: `#/components/schemas/${typeName}`,
      };
    }
  }

  private tsTypeToJsonSchema(
    nodeType: Type<ts.Type>,
    currentDefinition: string | undefined = undefined,
    isRoot: boolean | undefined = false
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject {
    if (nodeType.getCallSignatures().length > 0) {
      throw new Error(
        `Type cannot be a function: ${nodeType.getText()}, at: ${this.filePathAndLineNumberOfDeclaration(
          nodeType
        )}`
      );
    }

    if (this.shouldHandleRef(nodeType, currentDefinition, isRoot)) {
      return this.tsRefTypeToJsonSchema(nodeType);
    }

    if (nodeType.isNullable()) {
      return this.tsNullableTypeToJsonSchema(
        nodeType,
        currentDefinition,
        isRoot
      );
    } else if (nodeType.isBoolean()) {
      return {
        type: 'boolean',
      };
    } else if (nodeType.isNumber()) {
      return {
        type: 'number',
      };
    } else if (nodeType.isString()) {
      return {
        type: 'string',
      };
    } else if (nodeType.isLiteral()) {
      return this.tsLiteralTypeToJsonSchema(nodeType);
    } else if (nodeType.isArray()) {
      return this.tsArrayTypeToJsonSchema(nodeType);
    } else if (nodeType.isInterface() || nodeType.isObject()) {
      return this.tsObjectTypeToOpenApi(nodeType);
    } else if (nodeType.isEnum()) {
      return this.tsEnumTypeToJsonSchema(nodeType);
    } else if (nodeType.isIntersection()) {
      return this.tsIntersectionTypeToJsonSchema(nodeType);
    } else if (nodeType.isUnion()) {
      return this.tsUnionTypeToOpenApi(nodeType);
    } else if (nodeType.isUnknown()) {
      return {};
    } else if (nodeType.isAny()) {
      return {};
      // TODO: Those types are supported in OpenApi 3.1.0, wait for https://github.com/swagger-api/swagger-parser/issues/1535
    } else if (nodeType.isNull()) {
      throw new Error(
        `Type never is not supported in OpenApi 3.0.0, at: ${this.filePathAndLineNumberOfDeclaration(
          nodeType
        )}`
      );
    } else if (nodeType.isUndefined()) {
      throw new Error(
        `Type never is not supported in OpenApi 3.0.0, at: ${this.filePathAndLineNumberOfDeclaration(
          nodeType
        )}`
      );
    } else if (nodeType.getText() == 'never') {
      throw new Error(
        `Type never is not supported in OpenApi 3.0.0, at: ${this.filePathAndLineNumberOfDeclaration(
          nodeType
        )}`
      );
    } else if (nodeType.isClass()) {
      throw new Error('Type cannot be a class');
    }

    throw new Error('Unimplemented, ' + nodeType.getText());
  }

  private tsUnionTypeToOpenApi(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject {
    const res =
      this.parentNode
        .getFirstDescendant(
          (child) =>
            child.getType() === nodeType &&
            child.getKind() === SyntaxKind.PropertySignature
        )
        ?.getFirstChildByKind(SyntaxKind.UnionType)
        ?.forEachChildAsArray()
        .map((unionNodeType) =>
          this.tsTypeToJsonSchema(unionNodeType.getType())
        ) ||
      nodeType
        .getUnionTypes()
        .map((unionType) => this.tsTypeToJsonSchema(unionType));

    const [enumTypes, otherTypes] = _.partition(res, (type) => {
      return 'enum' in type && type.enum && type.enum.length !== 0;
    });

    if (enumTypes.length === 0) {
      return {
        oneOf: otherTypes,
      };
    }

    const joinedEnumTypes = enumTypes.reduce<OpenAPIV3.SchemaObject>(
      (res, type) => {
        return {
          enum: [
            ...(res.enum ? res.enum : []),
            ...('enum' in type && type.enum ? type.enum : []),
          ],
        };
      },
      {}
    );

    joinedEnumTypes.enum?.sort();

    const allTypes = _(enumTypes)
      .filter<OpenAPIV3.SchemaObject>(
        (type): type is OpenAPIV3.SchemaObject => 'type' in type
      )
      .groupBy((type) => type.type)
      .keys();

    if (allTypes.size() === 1) {
      joinedEnumTypes.type = allTypes.first() as any;
    }

    if (otherTypes.length === 0) {
      return joinedEnumTypes;
    } else {
      return {
        oneOf: [joinedEnumTypes, ...otherTypes],
      };
    }
  }

  private tsObjectTypeToOpenApi(
    nodeType: Type<ts.Type>
  ): OpenAPIV3.SchemaObject {
    const properties = nodeType.getProperties().reduce((res, property) => {
      const propertyName = property.getName();
      const type = this.propertyTypeToOpenApi(property);

      return {
        ...res,
        [propertyName]: type,
      };
    }, {});

    const requiredProperties = Object.entries<OpenAPIV3.SchemaObject>(
      properties
    )
      .filter(([key, value]) => value.nullable !== true)
      .map(([key]) => key)
      .sort();

    const stringIndexType = nodeType.getStringIndexType()
      ? this.tsTypeToJsonSchema(nodeType.getStringIndexType()!)
      : undefined;
    const numberIndexType = nodeType.getNumberIndexType()
      ? this.tsTypeToJsonSchema(nodeType.getNumberIndexType()!)
      : undefined;

    const additionalProperties =
      stringIndexType && numberIndexType
        ? {
            allOf: [stringIndexType, numberIndexType],
          }
        : stringIndexType
        ? stringIndexType
        : numberIndexType;

    return filterNonValidAndEmptyProperties({
      type: 'object',
      properties: properties,
      required: requiredProperties,
      additionalProperties: additionalProperties,
    });
  }

  private propertyTypeToOpenApi(property: Symbol) {
    const type = property.getTypeAtLocation(this.parentNode);

    const { description, example } = extractJsDocTags(property);

    const schema = this.tsTypeToJsonSchema(type);

    if (isReferenceObject(schema)) {
      try {
        const resolvedSchema = this._resolveReferencedSchema(schema);

        if (resolvedSchema) {
          if (example) {
            resolvedSchema.example = example;
          }

          if (description) {
            resolvedSchema.description = description;
          }

          return schema;
        }
      } catch {}
    }

    return filterNonValidAndEmptyProperties({
      description: description,
      example: example,
      ...schema,
    });
  }

  private _getAllRootProperties(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    res: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
  ): void {
    if (schema) {
      if (isReferenceObject(schema)) {
        return this._getAllRootProperties(
          this._resolveReferencedSchema(schema),
          res
        );
      } else if (schema.properties) {
        Object.entries(schema.properties).forEach(
          ([propertyName, subSchema]) => {
            res[propertyName] = subSchema;
          }
        );
      } else if (schema.allOf) {
        schema.allOf.forEach((subSchema) =>
          this._getAllRootProperties(subSchema, res)
        );
      }
    }
  }

  public getAllRootProperties(): Record<
    string,
    OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  > {
    const res = {};
    this._getAllRootProperties(_.cloneDeep(this._schema), res);
    return res;
  }

  public resolveRootProperties(): Record<string, OpenAPIV3.SchemaObject> {
    return _.mapValues(this.getAllRootProperties(), (subSchema) => {
      if (isReferenceObject(subSchema)) {
        return this._resolveReferencedSchema(subSchema);
      } else {
        return subSchema;
      }
    });
  }
}

export const getTypeName = (
  nodeType: Type<ts.Type>,
  parentNode: Node<ts.Node>
) => {
  return nodeType.isInterface()
    ? nodeType.getTypeArguments().length === 0
      ? nodeType.getSymbol()!.getName()
      : undefined
    : nodeType.getAliasSymbol()
    ? nodeType.getAliasTypeArguments()?.length === 0
      ? nodeType.getAliasSymbol()!.getName()
      : undefined
    : nodeType.isNullable() === false
    ? parentNode
        .getFirstDescendant(
          (child) =>
            child.getKind() === SyntaxKind.PropertySignature &&
            child.getType() === nodeType
        )
        ?.getFirstChildByKind(SyntaxKind.TypeReference)
        ?.getTypeName()
        .getText() ||
      parentNode
        .getFirstDescendant(
          (child) =>
            child.getKind() === SyntaxKind.TypeReference &&
            child.getType() === nodeType
        )
        ?.asKind(SyntaxKind.TypeReference)
        ?.getTypeName()
        .getText() ||
      undefined
    : undefined;
};

export type TsTypeToJsonSchemaArgs = {
  file: string;
  type: string;
  noTopRef?: boolean;
};

export const tsTypeToJsonSchema = (args: TsTypeToJsonSchemaArgs) => {
  const project = new Project({ compilerOptions: { strict: true } });
  const sourceFile = project.addSourceFileAtPath(args.file);

  const node = sourceFile
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .filter(
      (node) =>
        node.getType().getSymbol()?.getName() === args.type ||
        node.getType().getAliasSymbol()?.getName() === args.type
    )
    .at(0);

  if (!node) {
    throw new Error(`Unable to find type ${args.type} in ${args.file}`);
  }

  const jsonSchema = new TsToOpenApiTypeParser({
    node: node,
    noTopRef: args.noTopRef,
  }).jsonSchema();

  return JSON.stringify(jsonSchema, null, 2);
};
