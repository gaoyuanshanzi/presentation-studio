import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET() {
  const sql = getDbClient();
  if (!sql) {
    return NextResponse.json({ recordings: [], dbConnected: false });
  }

  try {
    const rows = await sql`
      SELECT id, title, duration, video_data, created_at
      FROM recordings
      ORDER BY created_at DESC
    `;
    const recordings = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      duration: r.duration,
      videoUrl: r.video_data,
      createdAt: r.created_at,
    }));
    return NextResponse.json({ recordings, dbConnected: true });
  } catch (error: any) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({ recordings: [], error: error.message, dbConnected: true });
  }
}

export async function POST(req: NextRequest) {
  const sql = getDbClient();
  const body = await req.json();
  const { id, title, duration, videoData } = body;

  if (!id || !title || !videoData) {
    return NextResponse.json({ error: 'Missing required recording parameters' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({
      success: true,
      message: 'Recording saved locally (Neon DB not connected)',
      dbConnected: false
    });
  }

  try {
    await sql`
      INSERT INTO recordings (id, title, duration, video_data, created_at)
      VALUES (${id}, ${title}, ${duration || 0}, ${videoData}, CURRENT_TIMESTAMP);
    `;

    return NextResponse.json({ success: true, message: 'MP4 saved to Neon DB successfully!', dbConnected: true });
  } catch (error: any) {
    console.error('Error saving recording to DB:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sql = getDbClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Recording ID required' }, { status: 400 });
  }

  if (!sql) {
    return NextResponse.json({ success: true, message: 'Deleted locally', dbConnected: false });
  }

  try {
    await sql`DELETE FROM recordings WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Recording completely removed from Neon DB', dbConnected: true });
  } catch (error: any) {
    console.error('Error deleting recording:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
