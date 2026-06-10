const fs = require('fs');
const path = require('path');
const google = require('googleapis').google;

const videoFile = process.argv[2];
const inputYamlPath = process.argv[4];
const titleOverride = process.argv[6];

if (!videoFile) {
  console.error('Usage: node simple-upload.js <videoFile> [--input yaml] [--title "..."]');
  process.exit(1);
}

const videoFilePath = path.resolve(videoFile);
const packageRoot = path.resolve(__dirname, '..');
const credentialsDir = path.join(packageRoot, '.credentials');
const tokenPath = path.join(credentialsDir, 'youtube-token.json');

if (!fs.existsSync(videoFilePath)) {
  console.error(`Video file not found: ${videoFilePath}`);
  process.exit(1);
}

if (!fs.existsSync(tokenPath)) {
  console.error(`Token not found: ${tokenPath}`);
  process.exit(1);
}

const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

async function upload() {
  const auth = new google.auth.OAuth2(
    'YOUR_CLIENT_ID',
    'YOUR_CLIENT_SECRET',
    'http://localhost:8080'
  );
  auth.setCredentials(token);

  const youtube = google.youtube({ version: 'v3', auth });

  // Read metadata
  let title = titleOverride || 'Untitled';
  let description = '';
  let tags = [];

  if (inputYamlPath && fs.existsSync(inputYamlPath)) {
    const yaml = require('js-yaml');
    const meta = yaml.load(fs.readFileSync(inputYamlPath, 'utf8'));
    if (!titleOverride && meta.title) title = meta.title;
    if (meta.description) description = meta.description;
    if (meta.tags && Array.isArray(meta.tags)) tags = meta.tags;
  }

  console.log('Uploading video:', title);
  console.log('Tags:', tags.join(', '));

  const fileSize = fs.statSync(videoFilePath).size;
  console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  // Schedule publish time
  const publishAt = new Date();
  publishAt.setDate(publishAt.getDate() + 1);
  publishAt.setHours(10, 0, 0, 0); // 10:00 UTC = 19:00 JST

  try {
    const res = await youtube.videos.insert(
      {
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title,
            description,
            tags: tags.slice(0, 30),
            categoryId: '27', // Education
            defaultLanguage: 'ja',
          },
          status: {
            privacyStatus: 'private',
            publishAt: publishAt.toISOString(),
          },
        },
        media: {
          body: fs.createReadStream(videoFilePath),
        },
        onUploadProgress: (evt) => {
          const progress = Math.round((evt.bytesProcessed / fileSize) * 100);
          process.stdout.write(`\rProgress: ${progress}%`);
        },
      },
      { maxBodyLength: Infinity, maxContentLength: Infinity }
    );

    console.log('\n✓ Upload complete!');
    console.log('Video ID:', res.data.id);
    console.log('URL:', `https://youtu.be/${res.data.id}`);
    console.log('Scheduled for:', publishAt.toLocaleString('ja-JP'));

    // Save result
    const result = {
      videoId: res.data.id,
      videoUrl: `https://youtu.be/${res.data.id}`,
      privacyStatus: 'private',
      publishAt: publishAt.toISOString(),
      scheduleJST: publishAt.toLocaleString('ja-JP'),
      uploadedAt: new Date().toISOString(),
    };

    const resultPath = path.join(packageRoot, 'output', `${path.basename(videoFile, '.mp4')}_upload_result.json`);
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Result saved to: ${resultPath}`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

upload();
