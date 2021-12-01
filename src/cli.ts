#!/usr/bin/env node

import { Command } from 'commander';
import { exit } from 'process';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { ConfigType, typescriptRoutesToOpenApi } from '.';
import { tsTypeToJsonSchema, TsTypeToJsonSchemaArgs } from './type_parser';

const loadConfigFile = (configPath: string): ConfigType => {
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

const handleErrors = (f: () => void) => {
  try {
    f();
  } catch (error: any) {
    console.error(error.message || error);
    exit(1);
  }
};

const onGenerate = (config?: string) => {
  handleErrors(() => {
    const configPath =
      config || path.join(process.cwd(), 'typescript-routes-to-openapi.json');

    typescriptRoutesToOpenApi(loadConfigFile(configPath));
  });
};

const onTsTypeToJsonSchema = (args: TsTypeToJsonSchemaArgs) => {
  handleErrors(() => {
    const jsonSchema = tsTypeToJsonSchema(args);
    console.log(JSON.stringify(jsonSchema, null, 2));
  });
};

const program = new Command();

program.version('0.0.1');

program
  .command('generate')
  .description('Generate OpenAPI 3.0.0 schema and routes')
  .option('-c, --config <string>', 'Path to config file')
  .action((options) => onGenerate(options.config));

program
  .command('tsTypeToJsonSchema')
  .description('Convert TypeScript type to JsonSchema')
  .option('--noTopRef', 'Do not include top ref')
  .requiredOption('--file <path>', 'TypeScript file')
  .requiredOption('--type <string>', 'TypeScript type')
  .action((options) =>
    onTsTypeToJsonSchema({
      file: options.file,
      type: options.type,
      noTopRef: options.onTopRef,
    })
  );

program.parse(process.argv);
