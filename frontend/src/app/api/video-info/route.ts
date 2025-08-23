import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URLが必要です' },
        { status: 400 }
      );
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: '有効なYouTube URLを入力してください' },
        { status: 400 }
      );
    }

    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    const duration = formatDuration(parseInt(videoDetails.lengthSeconds));

    // Supabaseクライアントを作成して認証情報を取得
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        { error: '認証エラーが発生しました' },
        { status: 401 }
      );
    }

    // 動画情報取得時にキューに追加（pending状態で）
    const { data: queueItem, error: queueError } = await supabase
      .from('download_logs')
      .insert({
        user_id: user.id,
        video_id: videoDetails.videoId,
        video_title: videoDetails.title,
        video_channel: videoDetails.author.name,
        video_duration: duration,
        video_thumbnail_url: videoDetails.thumbnails[0]?.url,
        download_format: 'mp4', // デフォルト
        download_status: 'pending'
      })
      .select()
      .single();

    if (queueError) {
      console.error('Failed to add to queue:', queueError);
      // キューの追加に失敗してもvideo-infoは返す
    }

    return NextResponse.json({
      id: videoDetails.videoId,
      title: videoDetails.title,
      channel: videoDetails.author.name,
      duration: duration,
      thumbnail: videoDetails.thumbnails[0]?.url || '/next.svg',
      description: videoDetails.description,
      queueId: queueItem?.id || null,
    });
  } catch (error) {
    console.error('Video info error:', error);
    return NextResponse.json(
      { error: '動画情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}