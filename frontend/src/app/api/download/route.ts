import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { url, format, logId } = await request.json();

    if (!url || !format) {
      return NextResponse.json(
        { error: 'URL and format are required' },
        { status: 400 }
      );
    }

    if (!['mp4', 'mp3'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Only mp4 and mp3 are supported' },
        { status: 400 }
      );
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: '有効なYouTube URLを入力してください' },
        { status: 400 }
      );
    }

    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title.replace(/[^\w\s-]/g, '').trim();
      
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

      // ログの処理（既存のログがある場合は更新、ない場合は新規作成）
      let downloadLog = null;
      if (logId) {
        // 既存のログを更新
        const { data: existingLog, error: updateError } = await supabase
          .from('download_logs')
          .update({
            download_format: format,
            download_status: 'in_progress'
          })
          .eq('id', logId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update download log:', updateError);
        } else {
          downloadLog = existingLog;
        }
      } else {
        // 新規ログを作成
        const { data: newLog, error: logError } = await supabase
          .from('download_logs')
          .insert({
            user_id: user.id,
            video_id: info.videoDetails.videoId,
            video_title: info.videoDetails.title,
            video_channel: info.videoDetails.author.name,
            video_duration: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
            video_thumbnail_url: info.videoDetails.thumbnails[0]?.url,
            download_format: format,
            download_status: 'in_progress'
          })
          .select()
          .single();

        if (logError) {
          console.error('Failed to create download log:', logError);
        } else {
          downloadLog = newLog;
        }
      }
      
      if (format === 'mp4') {
        const stream = ytdl(url, { 
          quality: 'highestvideo',
          filter: 'videoandaudio'
        });
        
        const chunks: Buffer[] = [];
        
        return new Promise((resolve) => {
          stream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          stream.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            
            // ダウンロード完了をログに記録
            if (downloadLog) {
              await supabase
                .from('download_logs')
                .update({
                  download_status: 'completed',
                  file_size_bytes: buffer.length
                })
                .eq('id', downloadLog.id);
            }
            
            const headers = new Headers();
            headers.set('Content-Type', 'video/mp4');
            headers.set('Content-Disposition', `attachment; filename="${title}.mp4"`);
            
            resolve(new NextResponse(buffer, {
              status: 200,
              headers,
            }));
          });
          
          stream.on('error', async (error) => {
            console.error('Stream error:', error);
            
            // エラー時のログ更新
            if (downloadLog) {
              await supabase
                .from('download_logs')
                .update({ download_status: 'failed' })
                .eq('id', downloadLog.id);
            }
            
            resolve(NextResponse.json(
              { error: 'ダウンロードに失敗しました' },
              { status: 500 }
            ));
          });
        });
      } else {
        const stream = ytdl(url, { 
          quality: 'highestaudio',
          filter: 'audioonly'
        });
        
        const chunks: Buffer[] = [];
        
        return new Promise((resolve) => {
          stream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          stream.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            
            // ダウンロード完了をログに記録
            if (downloadLog) {
              await supabase
                .from('download_logs')
                .update({
                  download_status: 'completed',
                  file_size_bytes: buffer.length
                })
                .eq('id', downloadLog.id);
            }
            
            const headers = new Headers();
            headers.set('Content-Type', 'audio/webm');
            headers.set('Content-Disposition', `attachment; filename="${title}.webm"`);
            
            resolve(new NextResponse(buffer, {
              status: 200,
              headers,
            }));
          });
          
          stream.on('error', async (error) => {
            console.error('Stream error:', error);
            
            // エラー時のログ更新
            if (downloadLog) {
              await supabase
                .from('download_logs')
                .update({ download_status: 'failed' })
                .eq('id', downloadLog.id);
            }
            
            resolve(NextResponse.json(
              { error: 'ダウンロードに失敗しました' },
              { status: 500 }
            ));
          });
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      return NextResponse.json(
        { error: 'ダウンロードに失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: '内部エラーが発生しました' },
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