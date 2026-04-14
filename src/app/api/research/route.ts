import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMMANDS, type CommandKey } from '@/lib/research/prompts';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { command, input } = body as { command: CommandKey; input: string };

  if (!command || !COMMANDS[command]) {
    return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return a mock response if no API key
    const mockOutput = `# ${COMMANDS[command].label}\n\n*AI research requires an Anthropic API key. Set ANTHROPIC_API_KEY in your .env file.*\n\n## Mock Response\n\nThis is a placeholder response for the \`/${command}\` command with input: "${input}".\n\nTo enable AI-powered research:\n1. Get an API key from console.anthropic.com\n2. Add \`ANTHROPIC_API_KEY=sk-...\` to your .env file\n3. Restart the dev server`;

    const run = await prisma.researchRun.create({
      data: { command, input, output: mockOutput, model: 'mock' },
    });

    return NextResponse.json({ output: mockOutput, runId: run.id });
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });

    const prompt = COMMANDS[command].prompt(input);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const output =
      message.content[0].type === 'text' ? message.content[0].text : '';

    const run = await prisma.researchRun.create({
      data: {
        command,
        input,
        output,
        model: 'claude-sonnet-4-20250514',
      },
    });

    return NextResponse.json({ output, runId: run.id });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Research request failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const runs = await prisma.researchRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(runs);
}
