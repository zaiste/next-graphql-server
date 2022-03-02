import { NextApiRequest, NextApiResponse } from 'next'

import {
  getGraphQLParameters,
  processRequest,
  sendResult,
  renderGraphiQL,
} from "graphql-helix";
import {
  envelop,
  useSchema,
  // useLogger,
  // useImmediateIntrospection,
  // useTiming,
} from "@envelop/core";
import { GraphQLSchema } from "graphql";

interface Options {
  schema: GraphQLSchema;
  isProduction: boolean;
}

export const Handler = ({ schema, isProduction }: Options) => {
  const plugins = [
    useSchema(schema),
    // useResponseCache(),
    ...(isProduction ? [] : []),
    // : [useLogger(), useTiming(), useImmediateIntrospection()]),
  ];

  const getEnveloped = envelop({ plugins });

  const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/html",
      });
      res.end(renderGraphiQL({ endpoint: "/api/graphql" }));
    } else {

      const { parse, validate, contextFactory, execute, schema } = getEnveloped(
        {
          req,
        }
      );

      const request = {
        body: req.body, 
        headers: req.headers,
        method: req.method!,
        query: req.query 
      };
      const { operationName, query, variables } = getGraphQLParameters(request);
      const result = await processRequest({
        operationName,
        query,
        variables,
        request,
        schema,
        parse,
        validate,
        execute,
        contextFactory,
      });

      sendResult(result, res);
    }
  };

  return handler;
};
