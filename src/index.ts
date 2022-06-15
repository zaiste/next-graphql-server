import type { NodeNextRequest } from "next/dist/server/base-http/node";
import { NextApiRequest, NextApiResponse } from 'next';
import { GraphQLSchema } from "graphql";

import {
  getGraphQLParameters,
  processRequest,
  sendResult,
  renderGraphiQL,
} from "graphql-helix";
import {
  envelop,
  useImmediateIntrospection as ImmediateIntrospection,
  useLogger as Logger,
  useSchema,
  useTiming as Timing,
} from "@envelop/core";
import { useResponseCache as ResponseCache, UseResponseCacheParameter } from '@envelop/response-cache';
import { useGenericAuth, GenericAuthPluginOptions } from '@envelop/generic-auth';

interface Options {
  useLogger?: boolean
  useTiming?: boolean
  useImmediateIntrospection?: boolean
  useResponseCache?: boolean | UseResponseCacheParameter
  useAuth?: GenericAuthPluginOptions 

  endpoint?: string
  edge?: boolean
}

export const createGraphQLHandler = (schema: GraphQLSchema, { 
  useLogger, useImmediateIntrospection, useTiming, useResponseCache,
  useAuth,
  endpoint = '/api/graphql',
  edge = false,
}: Options = {}) => {

  const plugins = [
    useSchema(schema),
    ...(useLogger ? [Logger()] : []),
    ...(useTiming ? [Timing()] : []),
    ...(useImmediateIntrospection ? [ImmediateIntrospection()] : []),
    ...(useResponseCache ? [ResponseCache(useResponseCache !== true ? useResponseCache : undefined)] : []),
    ...(useAuth ? [useGenericAuth(useAuth)] : []),
  ];

  const getEnveloped = envelop({ plugins });

  const handler = edge ? async (req: NodeNextRequest) => {
    if (req.method === "GET") {
      return new Response(renderGraphiQL({ endpoint }), { 
        headers: {
          "Content-Type": "text/html"
        }
      })
    } else {
      const enveloped = getEnveloped({ req });

      const { body, headers, method = 'GET' } = req;
      const request = { body, headers, method, query: '' };
      
      const params = getGraphQLParameters(request);
      const result = await processRequest({
        request,
        ...enveloped,
        ...params,
      });

      if (result.type === 'RESPONSE') {
        return new Response(JSON.stringify(result.payload), {
          headers: { 
            "Content-Type": "application/json"
          }
        })
      } else {
        return new Response('Something is not OK');
      }
    }
  } : async (req: NextApiRequest, res: NextApiResponse) => {
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
