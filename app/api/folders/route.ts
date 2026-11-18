import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserId, unauthorized } from '@/lib/auth';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const folders = await prisma.noteFolder.findMany({
      where: { userId },
      include: { notes: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(folders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load folders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  try {
    const data = await request.json();
    const folder = await prisma.noteFolder.create({
      data: {
        userId,
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
