import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { registerTools } from './tools';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'fina-app-mcp',
    version: '1.0.0',
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
