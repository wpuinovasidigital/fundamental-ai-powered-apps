import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import z from 'zod';
import {
  getBalanceSummary,
  getMcpAuthStatus,
  getTransactions,
  loginToMcp,
  logoutFromMcp,
  semanticSearchTransactions,
} from './client';
import { CATEGORIES } from '@/constants/transaction-constant';

export function registerTools(server: McpServer) {
  server.registerTool(
    'login',
    {
      description:
        'Login to Fina account using email and password to access and manage your financial data.',
      inputSchema: {
        email: z.email().describe('Your registered Fina email address'),
        password: z.string().min(1).describe('Your Fina account password'),
      },
    },
    async ({ email, password }) => {
      try {
        const user = await loginToMcp(email, password);
        return {
          content: [
            {
              type: 'text',
              text: `Login success! Connected as: ${user.email}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'logout',
    {
      description: 'Logout from the current active session in MCP',
    },
    async () => {
      await logoutFromMcp();
      return {
        content: [
          {
            type: 'text',
            text: `Logout success`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_auth_status',
    {
      description: 'Check current auth status in MCP session.',
    },
    async () => {
      const status = await getMcpAuthStatus();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_balance_summary',
    {
      description:
        'Get current financial summary including total income, total expenses, and net savings.',
    },
    async () => {
      try {
        const summary = await getBalanceSummary();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'get_transactions',
    {
      description:
        'Get list or filter transactions from financial history with optional search keyword, category, type, and pagination.',
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe('Search keyword in transaction description'),
        category: z.enum(CATEGORIES).optional().describe('Filter by category'),
        type: z
          .enum(['income', 'expense'])
          .optional()
          .describe('Filter by transaction type'),
        page: z
          .number()
          .int()
          .positive()
          .optional()
          .default(1)
          .describe('Page number (default: 1)'),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .default(10)
          .describe('Items per page (default: 10)'),
      },
    },
    async (args) => {
      try {
        const result = await getTransactions(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'semantic_search_transactions',
    {
      description:
        'Search transactions semantically using vector embeddings (finds conceptual matches like "transportation costs" or "food expenses".',
      inputSchema: {
        query: z
          .string()
          .describe('Search query for conceptual vector matching'),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .default(10)
          .describe('Maximum number of matches (default: 10)'),
      },
    },
    async ({ query, limit }) => {
      try {
        const result = await semanticSearchTransactions(query, 0.6, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
