# next-graphql-server

`next-graphql-server` is an easy to use Next.js library for creating performant GraphQL endpoints on top of [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction).

Start building GraphQL servers with Next.js.

## Features

* built using [Envelop](https://www.envelop.dev) and [Helix](https://graphql-helix.vercel.app) - stackable and easy to extend architecture
* supports Vercel Edge functions 

## Install

```
npm install next-graphql-server
```

```
pnpm add next-graphql-server
```

```
yarn add next-graphql-server
```

## Usage

`next-graphql-server` uses [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction). Create the `pages/api/graphql.js` with the following content:

```ts
// pages/api/graphql.(js|ts)
import { createGraphQLHandler } from "next-graphql-server";

const schema = `...` // your schema definition

const handler = createGraphQLHandler(schema);
export default handler;
```

