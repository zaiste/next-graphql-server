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
import { useGenericAuth, GenericAuthPluginOptions } from '@envelop/generic-auth';

const parseValue = (v: string): string | number | boolean => {
  if (v === "") {
    return true;
  } else if (v === "true") {
    return true;
  } else if (v === "false") {
    return false;
  } else if (!isNaN(Number(v))) {
    return +v;
  }
  return v;
}

interface Options {
  useLogger?: boolean
  useTiming?: boolean
  useImmediateIntrospection?: boolean
  useAuth?: GenericAuthPluginOptions

  endpoint?: string
  edge?: boolean
  context?: Function
}

export const createGraphQLHandler = (schema: GraphQLSchema, {
  useLogger, useImmediateIntrospection, useTiming,
  useAuth,
  endpoint = '/api/graphql',
  edge = false,
  context = () => { },
}: Options = {}) => {

  const plugins = [
    useSchema(schema),
    ...(useLogger ? [Logger()] : []),
    ...(useTiming ? [Timing()] : []),
    ...(useImmediateIntrospection ? [ImmediateIntrospection()] : []),
    ...(useAuth ? [useGenericAuth(useAuth)] : []),
  ];

  const getEnveloped = envelop({ plugins });

  const handler = edge ? async (req: Request) => {
    if (req.method === "GET") {
      return new Response(renderGraphiQL({ endpoint }), {
        headers: {
          "Content-Type": "text/html"
        }
      })
    } else {
      const enveloped = getEnveloped({ req });

      const { method = 'GET' } = req;

      const headers: Record<string, string> = {};
      for (const [key, value] of req.headers) {
        headers[key] = value
      }

      const u = new URL(req.url);
      const query: Record<string, string | number | boolean> = {};
      for (const p of u.searchParams) {
        query[p[0]] = parseValue(p[1]);
      }

      const request = { body: await req.json(), headers, method, query };

      const params = getGraphQLParameters(request);
      const result = await processRequest({
        request,
        ...enveloped,
        ...params,
        contextFactory: () => {
          return context(req)
        },
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
        contextFactory: () => {
          return context(req, res)
        },
      });

      sendResult(result, res);
    }
  };

  return handler;
};
