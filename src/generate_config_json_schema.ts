import { writeFileSync } from 'fs';
import path from 'path';
import { tsTypeToJsonSchema } from './type_parser';

const jsonSchema = tsTypeToJsonSchema({
  file: path.join(__dirname, 'index.ts'),
  type: 'ConfigType',
});

writeFileSync(path.join(__dirname, 'config_json_schema.json'), jsonSchema);

