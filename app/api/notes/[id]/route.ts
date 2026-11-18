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
    if (!(await prisma.note.findFirst({ where: { id, userId }, select: { id: true } }))) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    if (data.folderId && !(await prisma.noteFolder.findFirst({ where: { id: data.folderId, userId } }))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 400 });
    }
    const note = await prisma.note.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        color: data.color,
        folderId: data.folderId,
      },
      include: { folder: true }
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const { id } = await params;
    const { count } = await prisma.note.deleteMany({ where: { id, userId } });
    if (!count) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
