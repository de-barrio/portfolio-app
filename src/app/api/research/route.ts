import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { COMMANDS, type CommandKey } from '@/lib/research/prompts';

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { command, input } = body as { command: CommandKey; input: string };

  if (!command || !COMMANDS[command]) {
    return NextResponse.json({ error: 'Invalid command' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock mode: simulate streaming by chunking the mock text
    const mockOutput = `# ${COMMANDS[command].label}\n\n*AI research requires an Anthropic API key. Set ANTHROPIC_API_KEY in your .env file.*\n\n## Mock Response\n\nThis is a placeholder response for the \`/${command}\` command with input: "${input}".\n\nTo enable AI-powered research:\n1. Get an API key from console.anthropic.com\n2. Add \`ANTHROPIC_API_KEY=sk-...\` to your .env file\n3. Restart the dev server`;

    const stream = new ReadableStream({
      async start(controller) {
        // Chunk the mock text to simulate streaming
        const words = mockOutput.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i];
          controller.enqueue(sseEvent('delta', { text: chunk }));
          await new Promise((r) => setTimeout(r, 30));
        }

        const run = await prisma.researchRun.create({
          data: { command, input, output: mockOutput, model: 'mock' },
        });

        controller.enqueue(sseEvent('done', { runId: run.id }));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // Real Anthropic streaming
  const prompt = COMMANDS[command].prompt(input);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({ apiKey });

        const messageStream = client.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        });

        let fullOutput = '';

        messageStream.on('text', (text) => {
          fullOutput += text;
          controller.enqueue(sseEvent('delta', { text }));
        });

        await messageStream.finalMessage();

        const run = await prisma.researchRun.create({
          data: {
            command,
            input,
            output: fullOutput,
            model: 'claude-sonnet-4-20250514',
          },
        });

        controller.enqueue(sseEvent('done', { runId: run.id }));
        controller.close();
      } catch (error) {
        console.error('Research API error:', error);
        controller.enqueue(
          sseEvent('error', { message: 'Research request failed' })
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET() {
  const runs = await prisma.researchRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(runs);
}
