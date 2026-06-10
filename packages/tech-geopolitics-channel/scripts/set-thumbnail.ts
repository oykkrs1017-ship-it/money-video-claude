import * as path from 'path';
import * as fs from 'fs';
import { YouTubeAuth } from '@money-video/adapters/youtube';
import { google } from 'googleapis';

const [,, videoId, thumbnailPath] = process.argv;

if (!videoId || !thumbnailPath) {
  console.error('使い方: ts-node scripts/set-thumbnail.ts <videoId> <thumbnailPath>');
  process.exit(1);
}

(async () => {
  const credentialsDir = path.resolve('.credentials');
  const auth = await new YouTubeAuth({ credentialsDir }).authorize();
  const youtube = google.youtube({ version: 'v3', auth: auth as any });

  const res = await youtube.thumbnails.set({
    videoId,
    media: { mimeType: 'image/jpeg', body: fs.createReadStream(path.resolve(thumbnailPath)) },
  });
  console.log('✅ サムネイル設定完了 status:', res.status);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
