const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// YouTube URL doğrulama
function isValidYouTubeURL(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
}

// Video ID çıkarma
function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

// Video bilgilerini getir
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;

        if (!isValidYouTubeURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Video ID bulunamadı' });
        }

        try {
            // YouTube oEmbed API kullan
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await axios.get(oembedUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const videoDetails = {
                title: response.data.title,
                author: response.data.author_name,
                lengthSeconds: 'Bilinmiyor',
                thumbnail: response.data.thumbnail_url
            };

            res.json(videoDetails);
        } catch (oembedError) {
            console.log('oEmbed hatası:', oembedError.message);
            const videoDetails = {
                title: `YouTube Video ${videoId}`,
                author: 'YouTube Kullanıcısı',
                lengthSeconds: 'Bilinmiyor',
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            };

            res.json(videoDetails);
        }
    } catch (error) {
        console.error('Video bilgisi alınamadı:', error);
        res.status(500).json({ error: 'Video bilgisi alınamadı' });
    }
});

// Ses dosyası streaming
app.post('/api/download', async (req, res) => {
    const tempDir = path.join(__dirname, 'temp');
    const audioDir = path.join(__dirname, 'public', 'audio');

    try {
        const { url } = req.body;

        if (!isValidYouTubeURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        // Klasörleri oluştur
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }

        // Python ile indir
        const pythonCommand = `python3 download.py "${url}" "${tempDir}"`;
        console.log('Python komutu:', pythonCommand);

        const result = await new Promise((resolve, reject) => {
            exec(pythonCommand, { timeout: 180000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Python hatası:', error);
                    reject(error);
                    return;
                }

                try {
                    const lines = stdout.trim().split('\n');
                    const jsonLine = lines[lines.length - 1];
                    const result = JSON.parse(jsonLine);
                    resolve(result);
                } catch (parseError) {
                    console.error('JSON parse hatası:', parseError);
                    reject(parseError);
                }
            });
        });

        if (!result.success) {
            // Alternatif siteler öner
            const videoId = extractVideoId(url);
            return res.json({
                error: 'YouTube erişimi engellendi',
                message: 'Alternatif siteler kullanın:',
                alternatives: [
                    `https://y2mate.com/youtube/${videoId}`,
                    `https://ytmp3.cc/youtube-to-mp3/`,
                    `https://mp3download.to/`
                ]
            });
        }

        const tempFile = result.path;
        if (!fs.existsSync(tempFile)) {
            throw new Error('Dosya bulunamadı');
        }

        // Dosyayı public/audio klasörüne kopyala
        const audioId = Date.now().toString();
        const publicAudioPath = path.join(audioDir, `${audioId}.mp3`);
        
        fs.copyFileSync(tempFile, publicAudioPath);
        
        // Temp dosyayı sil
        fs.unlinkSync(tempFile);

        // Response gönder
        res.json({
            success: true,
            title: result.title,
            duration: result.duration,
            audioUrl: `/audio/${audioId}.mp3`,
            size: result.size
        });

        // 10 dakika sonra public dosyayı sil
        setTimeout(() => {
            if (fs.existsSync(publicAudioPath)) {
                fs.unlinkSync(publicAudioPath);
            }
        }, 10 * 60 * 1000);

    } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ error: 'İşlem başarısız: ' + error.message });
    }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});