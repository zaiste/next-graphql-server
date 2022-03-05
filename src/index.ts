import { NextApiRequest, NextApiResponse } from 'next'
import { GraphQLSchema } from "graphql";

import {
  getGraphQLParameters,
  processRequest,
  sendResult,
  renderGraphiQL,
} from "graphql-helix";
import {
  envelop,
  useImmediateIntrospection,
  useLogger,
  useSchema,
  useTiming,
} from "@envelop/core";
import { useResponseCache } from '@envelop/response-cache';

interface Options {
  isLogger?: boolean
  isTiming?: boolean
  isImmediateIntrospection?: boolean
  isResponseCache?: boolean

  endpoint?: string
}

export const createGraphQLHandler = (schema: GraphQLSchema, { 
  isLogger, isImmediateIntrospection, isTiming, isResponseCache,
  endpoint = '/api/graphql'
}: Options = {}) => {

  const plugins = [
    useSchema(schema),
    ...(isLogger ? [useLogger()] : []),
    ...(isTiming ? [useTiming()] : []),
    ...(isImmediateIntrospection ? [useImmediateIntrospection()] : []),
    ...(isResponseCache ? [useResponseCache()] : []),
  ];

  const getEnveloped = envelop({ plugins });

  const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      res.writeHead(200, {
        "content-type": "text/html",
      });
      res.end(renderGraphiQL({ endpoint }));
    } else {

      const enveloped = getEnveloped({ req });

      const { body, headers, method = 'GET', query } = req;
      const request = { body, headers, method, query };
      
      const params = getGraphQLParameters(request);
      const result = await processRequest({
        request,
        ...enveloped,
        ...params,
      });

      sendResult(result, res);
    }
  };

  return handler;
};
