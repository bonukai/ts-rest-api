#!/usr/bin/env node

import { Command } from 'commander';
import { exit } from 'process';

import {
  defaultConfigPath,
  loadConfigFile,
  typescriptRoutesToOpenApi,
} from '.';
import { tsTypeToJsonSchema, TsTypeToJsonSchemaArgs } from './type_parser';

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
    const configPath = config || defaultConfigPath();

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
