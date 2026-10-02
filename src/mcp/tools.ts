import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import z from 'zod';
import { getMcpAuthStatus, loginToMcp, logoutFromMcp } from './client';

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
}
