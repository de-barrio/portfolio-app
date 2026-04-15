import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const source = searchParams.get('source');
  const assetId = searchParams.get('assetId');

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }
  if (source) where.source = source;
  if (assetId) where.assetId = assetId;

  const notes = await prisma.researchNote.findMany({
    where,
    include: { asset: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, source, commandType, portfolioId, versionId, assetId } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const note = await prisma.researchNote.create({
    data: {
      title: title?.trim() || null,
      content: content.trim(),
      source: source || 'manual',
      commandType: commandType || null,
      portfolioId: portfolioId || null,
      versionId: versionId || null,
      assetId: assetId || null,
    },
  });

  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await prisma.researchNote.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
