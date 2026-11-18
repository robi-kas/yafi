import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const notes = await prisma.note.findMany({
      where: { userId },
      include: { folder: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const data = await request.json();
    let folderId: string | null = data.folderId || null;
    if (folderId && !(await prisma.noteFolder.findFirst({ where: { id: folderId, userId } }))) {
      folderId = null;
    }
    const note = await prisma.note.create({
      data: {
        userId,
        title: data.title || 'Untitled Note',
        content: data.content || '',
        color: data.color || 'yellow',
        folderId,
      },
      include: { folder: true }
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
