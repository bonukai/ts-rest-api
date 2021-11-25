# typescript-routes-to-openapi &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bonukai/typescript-routes-to-openapi/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/typescript-routes-to-openapi.svg?style=flat)](https://www.npmjs.com/package/typescript-routes-to-openapi)

Generate [OpenApi](https://swagger.io/specification/) document and input validators with [Ajv](ajv.js.org/) for [express](https://expressjs.com/) server from [TypeScript](https://www.typescriptlang.org/) project.

## Installation

```
npm install typescript-routes-to-openapi
npm install --save-dev path-to-regexp ts-morph
```

## Usage

### Create configuration file

`typescript-routes-to-openapi.json`

```json
{
  "openapi": {
    "info": {
      "version": "1.0.0",
      "title": "Swagger Petstore",
      "description": "A sample API that uses a petstore as an example to demonstrate features in the OpenAPI 3.0 specification",
      "termsOfService": "http://swagger.io/terms/",
      "contact": {
        "name": "Swagger API Team",
        "email": "apiteam@swagger.io",
        "url": "http://swagger.io"
      },
      "license": {
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
      }
    },
    "servers": [
      {
        "url": "http://petstore.swagger.io/api"
      }
    ]
  },
  "generateValidators": true
}
```

### Create controller

```TypeScript
import { createExpressRoute } from 'typescript-routes-to-openapi';

type NewPet = {
  name: string;
  tag?: string;
};

type Pet = NewPet & {
  id: number;
};

export class PetController {
  findPets = createExpressRoute<{
    path: '/pets';
    method: 'get';
    requestQuery: {
      /**
       * @description tags to filter by
       */
      tags?: string[];
      /**
       * @description maximum number of results to return
       */
      limit?: number;
    };
    /**
     * @description pet response
     */
    responseBody: Pet[];
  }>((req, res) => {
    res.send([
      {
        id: 1,
        name: 'Garfield',
        tag: 'cat',
      },
    ]);
  });

  /**
   * @description Returns a user based on a single ID, if the user does not have access to the pet
   * @openapi_operationId find pet by id
   */
  findPetById = createExpressRoute<{
    path: '/pets/:id';
    method: 'get';
    pathParams: {
      /**
       * @description ID of pet to fetch
       */
      id: number;
    };
    /**
     * @description pet response
     */
    responseBody: Pet;
  }>((req, res) => {
    res.send({
      id: 1,
      name: 'Garfield',
      tag: 'cat',
    });
  });

  /**
   * @description Creates a new pet in the store. Duplicates are allowed
   * @openapi_operationId addPet
   */
  addPet = createExpressRoute<{
    path: '/pets';
    method: 'post';
    /**
     * @description Pet to add to the store
     */
    requestBody: NewPet;
    /**
     * @description pet response
     */
    responseBody: Pet[];
  }>((req, res) => {
    res.send([
      {
        id: 1,
        name: 'Garfield',
        tag: 'cat',
      },
    ]);
  });
}

```

### Generate routes and OpenApi document

```
npx typescript-routes-to-openapi generate
```

### Include generated routes in your express application

```TypeScript
import express from 'express';
import { generatedRoutes } from './generated/routes';

const app = express();
const PORT = 8888;

app.use(express.json());
app.use(generatedRoutes);

app.listen(PORT, () => {
  console.log('Listening on', PORT);
});

```


See [example](examples/petstore-express)
