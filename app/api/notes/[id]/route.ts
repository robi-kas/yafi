import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const note = await prisma.note.update({
      where: { id: params.id },
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.note.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
