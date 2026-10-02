import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { getBalanceSummary, getTransactions } from './client';

export function registerResources(server: McpServer) {
  server.registerResource(
    'balance',
    'fina://balance',
    {
      description: 'Get current balance summary',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const summary = await getBalanceSummary();
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(summary, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({
                error: `${error instanceof Error ? error.message : String(error)}`,
              }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );

  server.registerResource(
    'recent-transactions',
    'fina://transactions/recent',
    {
      description: 'List 10 most recent transactions',
      mimeType: 'application/json',
    },
    async (uri) => {
      try {
        const result = await getTransactions({ limit: 10, page: 1 });
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(result.data, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      } catch (error) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({
                error: `${error instanceof Error ? error.message : String(error)}`,
              }),
              mimeType: 'application/json',
            },
          ],
        };
      }
    },
  );
}
