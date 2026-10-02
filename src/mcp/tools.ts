import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import z from 'zod';
import {
  createTransaction,
  deleteTransaction,
  getBalanceSummary,
  getMcpAuthStatus,
  getTransactions,
  loginToMcp,
  logoutFromMcp,
  semanticSearchTransactions,
  updateTransaction,
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
              text: `Error in get balance summary: ${error instanceof Error ? error.message : String(error)}`,
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
              text: `Error on get transactions: ${error instanceof Error ? error.message : String(error)}`,
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
              text: `Error in semantic search: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'create_transaction',
    {
      description: 'Add a new income or expense transaction in Fina.',
      inputSchema: {
        amount: z
          .number()
          .positive()
          .describe('Transaction nominal ammount (e.g. 50000)'),
        category: z
          .enum(CATEGORIES)
          .describe(`Category of transaction (${CATEGORIES.join(', ')})`),
        type: z
          .enum(['income', 'expense'])
          .describe('Type of transaction ("income" or "expense")'),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe('Date in YYY-MM-DD format (e.g. 2026-09-30)'),
        description: z
          .string()
          .min(1)
          .describe('Short description of the transaction'),
      },
    },
    async (args) => {
      try {
        const result = await createTransaction(args);
        return {
          content: [
            {
              type: 'text',
              text: `Transaction successfully created:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating transaction ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'update_transaction',
    {
      description: 'Add a new income or expense transaction in Fina.',
      inputSchema: {
        id: z
          .uuid()
          .describe('Unique identifier (UUID) of ther transaction to update'),
        amount: z
          .number()
          .positive()
          .optional()
          .describe('Transaction nominal ammount (e.g. 50000)'),
        category: z
          .enum(CATEGORIES)
          .optional()
          .describe(`Category of transaction (${CATEGORIES.join(', ')})`),
        type: z
          .enum(['income', 'expense'])
          .optional()
          .describe('Type of transaction ("income" or "expense")'),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Date in YYY-MM-DD format (e.g. 2026-09-30)'),
        description: z
          .string()
          .min(1)
          .optional()
          .describe('Short description of the transaction'),
      },
    },
    async ({ id, ...transaction }) => {
      try {
        const result = await updateTransaction(id, transaction);
        return {
          content: [
            {
              type: 'text',
              text: `Transaction successfully updated:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating transaction ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'delete_transaction',
    {
      description:
        'Delete a transaction from financial history by its unique identifier ID (UUID).',
      inputSchema: {
        id: z
          .uuid()
          .describe('Unique identifier (UUID) of ther transaction to delete'),
      },
    },
    async ({ id }) => {
      try {
        const result = await deleteTransaction(id);
        return {
          content: [
            {
              type: 'text',
              text: `Transaction successfully deleted.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error deleting transaction ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
