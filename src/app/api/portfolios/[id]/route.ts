import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    include: {
      draft: {
        include: {
          positions: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
      },
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(portfolio);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, description, intentTag, benchmark } = body;

  const portfolio = await prisma.portfolio.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(intentTag !== undefined && { intentTag }),
      ...(benchmark !== undefined && { benchmark }),
    },
  });

  return NextResponse.json(portfolio);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.portfolio.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
