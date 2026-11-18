import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const { id } = await params;
    const data = await request.json();
    const { count } = await prisma.noteFolder.updateMany({
      where: { id, userId },
      data: { name: data.name, color: data.color }
    });
    if (!count) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json(await prisma.noteFolder.findUnique({ where: { id } }));
  } catch (error) {
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const { id } = await params;
    const { count } = await prisma.noteFolder.deleteMany({ where: { id, userId } });
    if (!count) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
