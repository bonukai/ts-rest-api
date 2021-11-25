import _ from 'lodash';
import { Node, ts, SyntaxKind, JSDocTag, Symbol, Type } from 'ts-morph';

export function extractJsDocTags(node?: Node<ts.Node>): Record<string, string>;
export function extractJsDocTags(symbol?: Symbol): Record<string, string>;
export function extractJsDocTags(
  propertyNodeType: Type<ts.Type>,
  parentNode: Node<ts.Node>
): Record<string, string>;
export function extractJsDocTags(
  arg?: any,
  arg2?: any
): Record<string, string> {
  if (!arg) {
    return {};
  }

  if (arg instanceof Node) {
    return arg.getParent()?.getKind() === SyntaxKind.PropertyDeclaration ||
      arg.getParent()?.getKind() === SyntaxKind.ExpressionStatement
      ? mapJsDocTags(findJsDocTagsInNode(arg.getParent()))
      : mapJsDocTags(findJsDocTagsInNode(arg));
  } else if (arg instanceof Symbol) {
    return mapJsDocTags(findJsDocTagsInSymbol(arg));
  } else if (arg instanceof Type && arg2 instanceof Node) {
    const propertySignatureNode = arg2
      .getFirstDescendant(
        (child) =>
          child.getParentIfKind(SyntaxKind.PropertySignature) !== undefined &&
          child.getKind() === SyntaxKind.Identifier &&
          child.getType() === arg
      )
      ?.getParent();
    return mapJsDocTags(findJsDocTagsInNode(propertySignatureNode));
  }

  return {};
}

const findJsDocTagsInNode = (node?: Node<ts.Node>) => {
  return (
    node
      ?.getChildrenOfKind(SyntaxKind.JSDocComment)
      .flatMap((comment) =>
        comment.getDescendantsOfKind(SyntaxKind.JSDocTag)
      ) || []
  );
};

const findJsDocTagsInSymbol = (symbol?: Symbol): JSDocTag[] => {
  return findJsDocTagsInNode(
    symbol
      ?.getDeclarations()
      .at(0)
      ?.getSourceFile()
      .getFirstDescendant((child) => child.getSymbol() === symbol)
  );
};

const mapJsDocTags = (jsDocTags: JSDocTag[]) => {
  return _(jsDocTags)
    .groupBy((tag) => tag.getTagName())
    .mapValues((tags) =>
      tags.filter((tag) => typeof tag.getComment() === 'string')
    )
    .pickBy((tags) => tags.length > 0)
    .mapValues((tags) => tags.at(0)!.getCommentText()!.toString())
    .value();
};
