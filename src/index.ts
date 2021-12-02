import _ from 'lodash';
import { OpenAPIV3 } from 'openapi-types';
import path from 'path';
import Ajv from 'ajv';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';

import { generateOpenApiDocument } from './generators/openapi';
import { generateRoutes } from './generators/routes';
import { checkProgramForErrors, getRoutes } from './find_routes';
import configJsonSchema from './config_json_schema.json';
import { createExpressRoute, registerRoute, ValidationError } from './server';
export { createExpressRoute, registerRoute, ValidationError };

export class RouteValidationError extends Error {
  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, RouteValidationError.prototype);
  }
}
export class InvalidParamsType extends Error {
  constructor(message?: string) {
    super(message);

    Object.setPrototypeOf(this, InvalidParamsType.prototype);
  }
}

export type ConfigType = {
  openapi: Omit<
    OpenAPIV3.Document,
    | 'openapi'
    | 'paths'
    | 'components'
    | 'x-express-openapi-additional-middleware'
    | 'x-express-openapi-validation-strict'
  > & {
    components?: Omit<OpenAPIV3.ComponentsObject, 'schemas'>;
  };
  tsConfigPath?: string;
  schemaOutputDir?: string;
  schemaOutputFileName?: string;
  routesOutputDir?: string;
  routesOutputFileName?: string;
  generateOpenApiSchema?: boolean;
  checkProgramForErrors?: boolean;
};

const defaultConfig: Omit<ConfigType, 'openapi'> = {
  tsConfigPath: path.join(process.cwd(), 'tsconfig.json'),
  generateOpenApiSchema: true,
  checkProgramForErrors: true,
  schemaOutputDir: process.cwd(),
  schemaOutputFileName: 'openapi.json',
  routesOutputDir: path.join(process.cwd(), 'generated'),
  routesOutputFileName: 'routes.ts',
};

const validateConfig = (config: ConfigType) => {
  const ajv = new Ajv();

  if (!ajv.validate(configJsonSchema, config)) {
    throw new Error(
      `Invalid config file: ${ajv.errorsText(ajv.errors, {
        dataVar: 'Config',
      })}`
    );
  }
};

const loadAndValidateConfig = (config?: ConfigType) => {
  if (!config) {
    config = loadConfigFile(defaultConfigPath());
  }

  config = {
    ...defaultConfig,
    ...config,
  };

  validateConfig(config);

  return config;
};

const getRoutesAndOpenApiDocument = (config: ConfigType) => {
  const tsConfigFileFilePath = config.tsConfigPath!;

  if (config.checkProgramForErrors) {
    checkProgramForErrors(tsConfigFileFilePath);
  }

  const routes = getRoutes(tsConfigFileFilePath);

  let generatedOpenApiDocument: string | undefined = undefined;

  if (config.generateOpenApiSchema === true) {
    generatedOpenApiDocument = generateOpenApiDocument(routes, config.openapi);
  }

  const generatedRoutesFile = generateRoutes(routes, config.routesOutputDir!);

  return {
    routesFile: generatedRoutesFile,
    openApiDocument: generatedOpenApiDocument,
  };
};

export const typescriptRoutesToOpenApi = (config?: ConfigType) => {
  config = loadAndValidateConfig(config);

  const tsConfigFileFilePath = config.tsConfigPath!;

  if (config.checkProgramForErrors) {
    overridePreviouslyGeneratedRoutesFile(config);
    checkProgramForErrors(tsConfigFileFilePath);
  }

  const { openApiDocument, routesFile } = getRoutesAndOpenApiDocument(config);

  if (config.generateOpenApiSchema === true) {
    const openApiDocumentFilePath = getOpenApiDocumentFilePath(config);

    createDirs(openApiDocumentFilePath);
    if (writeFileIfDifferent(openApiDocumentFilePath, openApiDocument!)) {
      console.log('Generated OpenApi schema to:', openApiDocumentFilePath);
    }
  }

  const routesFilePath = getRoutesFilePath(config);

  createDirs(routesFilePath);
  if (writeFileIfDifferent(routesFilePath, routesFile)) {
    console.log('Generated routes to:', routesFilePath);
  }
};

export const defaultConfigPath = () => {
  return path.join(process.cwd(), 'typescript-routes-to-openapi.json');
};

export const loadConfigFile = (configPath: string): ConfigType => {
  if (!existsSync(configPath)) {
    throw new Error(`Config file does not exist: ${configPath}`);
  }

  if (!statSync(configPath).isFile()) {
    throw new Error(`Config needs to be a regular file: ${configPath}`);
  }

  const fileContent = readFileSync(path.resolve(configPath)).toString();
  const config = JSON.parse(fileContent);

  return config;
};

const getOpenApiDocumentFilePath = (config: ConfigType) => {
  return path.join(config.schemaOutputDir!, config.schemaOutputFileName!);
};

const getRoutesFilePath = (config: ConfigType) => {
  return path.join(config.routesOutputDir!, config.routesOutputFileName!);
};

const createDirs = (filePath: string) => {
  if (!existsSync(path.dirname(filePath))) {
    mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
  }
};

const writeFileIfDifferent = (file: string, data: string) => {
  const fileContent = readFileSync(file);

  if (data !== fileContent.toString('utf-8')) {
    writeFileSync(file, data);
    return true;
  }

  return false;
};

const overridePreviouslyGeneratedRoutesFile = (config: ConfigType) => {
  const routesOutputPath = path.join(
    config.routesOutputDir!,
    config.routesOutputFileName!
  );

  if (existsSync(routesOutputPath)) {
    writeFileSync(
      routesOutputPath,
      `// This file was generated by typescript-routes-to-openapi

import express, { Router } from 'express';

const router: Router = express.Router();

export { router as generatedRoutes };`
    );
  }
};
