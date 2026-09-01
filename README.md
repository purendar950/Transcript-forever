# 🎬 Transcript Forever

Free YouTube Transcript API + Telegram Bot — runs 24/7 on Cloudflare Workers.

**No server. No credit card. Always on. $0 cost.**

## 🚀 Quick Deploy

```bash
# Clone the repo
git clone https://github.com/purendar950/Transcript-forever.git
cd Transcript-forever

# One-click setup
bash setup.sh
```

That's it. The script handles everything:
1. Installs dependencies
2. Logs into Cloudflare
3. Sets your bot token
4. Deploys the worker
5. Connects Telegram webhook

## 📡 API Usage

Your other projects can call these endpoints:

### GET Request
```bash
curl "YOUR_WORKER_URL/api/transcript?url=https://youtube.com/watch?v=dQw4w9WgXcQ&format=plain"
```

### POST Request
```bash
curl -X POST "YOUR_WORKER_URL/api/transcript" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ", "format": "timestamps"}'
```

### Response
```json
{
  "success": true,
  "video_id": "dQw4w9WgXcQ",
  "format": "plain",
  "word_count": 152,
  "segment_count": 38,
  "transcript": "We're no strangers to love..."
}
```

### Available Formats

| Format | Description |
|--------|-------------|
| `plain` | Clean readable text |
| `timestamps` | Text with [MM:SS] markers |
| `paragraphs` | Split by natural pauses |
| `summary` | Condensed ~500 words |
| `srt` | SRT subtitle file format |

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/transcript` | Get YouTube transcript |
| GET | `/api/formats` | List available formats |
| GET | `/api/health` | Health check |
| POST | `/webhook` | Telegram webhook (auto) |

## 💻 Use in Your Project

### JavaScript / Node.js
```javascript
const res = await fetch('YOUR_WORKER_URL/api/transcript?url=https://youtube.com/watch?v=abc&format=plain');
const data = await res.json();
console.log(data.transcript);
```

### Python
```python
import requests

r = requests.get('YOUR_WORKER_URL/api/transcript', params={
    'url': 'https://youtube.com/watch?v=abc',
    'format': 'plain'
})
print(r.json()['transcript'])
```

### cURL
```bash
curl "YOUR_WORKER_URL/api/transcript?url=https://youtube.com/watch?v=abc&format=plain"
```

## 📱 Telegram Bot

1. Open Telegram → find your bot
2. Send a YouTube URL
3. Pick a format
4. Get the transcript

Commands:
- `/start` — Welcome message
- `/help` — How to use

## 🔧 Manual Setup

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set bot token
echo "YOUR_BOT_TOKEN" | wrangler secret put BOT_TOKEN

# Deploy
wrangler deploy

# Set Telegram webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://YOUR-WORKER.workers.dev/webhook"
```

## 📁 Project Structure

```
Transcript-forever/
├── worker.js        # Main worker (Telegram bot + API)
├── wrangler.toml    # Cloudflare config
├── package.json     # Dependencies
├── setup.sh         # One-click setup script
├── .gitignore
└── README.md
```

## ⚡ Free Tier Limits

| Limit | Value |
|-------|-------|
| Requests/day | 100,000 |
| CPU time/request | 10ms |
| Memory | 128MB |

For personal use, you'll never hit these limits.

## 🔄 Updating

After making changes to `worker.js`:

```bash
wrangler deploy
```

## 📜 License

MIT
