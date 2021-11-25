import { TsToOpenApiTypeParser } from './type_parser';

export type Route = {
  description?: string;
  summary?: string;
  tags?: string[];
  operationId?: string;
  path: string;
  method: string;
  pathParams?: TsToOpenApiTypeParser;
  responseBody?: TsToOpenApiTypeParser;
  requestBody?: TsToOpenApiTypeParser;
  requestQuery?: TsToOpenApiTypeParser;
  className?: string;
  methodName?: string;
  sourceFilePath?: string;
};
