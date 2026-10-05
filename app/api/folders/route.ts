import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const folders = await prisma.noteFolder.findMany({
      include: { notes: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(folders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const folder = await prisma.noteFolder.create({
      data: {
        name: data.name || 'New Folder',
        color: data.color || 'gray',
      },
      include: { notes: true }
    });
    return NextResponse.json(folder);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
