import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import z from 'zod';

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    'financial-health-check',
    {
      description:
        'Audit the user financial condition, review recent transactions, and provide actionable budgeting advice.',
      argsSchema: {
        focus: z
          .string()
          .optional()
          .describe(
            'Specific focus area (e.g. food spending, savings goal, entertainment)',
          ),
      },
    },
    ({ focus }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please audit my financial condition in Fina.
First, call \`get_balance_summary\` to inspect my total income, expenses and savings.
Next, call \`list_transactions\` to review my latest 15 transactions.
${focus ? `Focus particularly on: ${focus}` : 'Look for spending patterns, anomalies, and potential cost savings.'}.
Provide a structured, encouraging summary with 3 actionable tips.`,
          },
        },
      ],
    }),
  );
}
