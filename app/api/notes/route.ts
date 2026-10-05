import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const notes = await prisma.note.findMany({
      include: { folder: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const note = await prisma.note.create({
      data: {
        title: data.title || 'Untitled Note',
        content: data.content || '',
        color: data.color || 'yellow',
        folderId: data.folderId || null,
      },
      include: { folder: true }
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
