import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const folder = await prisma.noteFolder.update({
      where: { id: params.id },
      data: {
        name: data.name,
        color: data.color,
      }
    });
    return NextResponse.json(folder);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.noteFolder.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
