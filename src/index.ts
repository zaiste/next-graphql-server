import type { NextApiRequest, NextApiResponse } from 'next';

import * as GraphQL from "graphql";


import {
  envelop,
  useLogger as Logger,
  useSchema,
  useEngine
} from "@envelop/core";
import { useGenericAuth, GenericAuthPluginOptions } from '@envelop/generic-auth';

import { GraphiQL } from './graphiql';

interface Options {
  useLogger?: boolean
  useTiming?: boolean
  useImmediateIntrospection?: boolean
  useAuth?: GenericAuthPluginOptions

  endpoint?: string
  edge?: boolean
  context?: Function
}

export const createGraphQLHandler = (schema: GraphQL.GraphQLSchema, {
  useLogger,
  useAuth,
  endpoint = '/api/graphql',
  edge = false,
  context = () => { },
}: Options = {}) => {

  const plugins = [
    useEngine(GraphQL),
    useSchema(schema),
    ...(useLogger ? [Logger()] : []),
    ...(useAuth ? [useGenericAuth(useAuth)] : []),
  ];

  const getEnveloped = envelop({ plugins });

  const handler = edge ? async (req: Request) => {
    if (req.method === "GET") {
      return new Response(GraphiQL(endpoint), {
        headers: {
          "Content-Type": "text/html"
        }
      })
    } else {
      const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req });

      const _a = context;

      const { query, variables } = await req.json();
      const document = parse(query)
      const validationErrors = validate(schema, document)

      if (validationErrors.length > 0) {
        return new Response(JSON.stringify({ errors: validationErrors }))
      }

      const contextValue = await contextFactory()
      const result = await execute({
        document,
        schema,
        variableValues: variables,
        contextValue
      })

      return new Response(JSON.stringify(result), {
        headers: {
          "Content-Type": "application/json"
        }
      })
    }
  } : async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/html",
      });
      res.end(GraphiQL(endpoint));
    } else {
      const {
        parse,
        validate,
        contextFactory,
        execute,
        schema
      } = getEnveloped({ req })

      const { query, variables } = req.body
      const document = parse(query)
      const validationErrors = validate(schema, document)

      if (validationErrors.length > 0) {
        return res.end(JSON.stringify({ errors: validationErrors }))
      }

      // Build the context and execute
      const contextValue = await contextFactory()
      const result = await execute({
        document,
        schema,
        variableValues: variables,
        contextValue
      })

      // Send the response
      res.end(JSON.stringify(result))
    }

    return
  };

  return handler;
};
