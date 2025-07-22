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

// Ana indirme endpoint'i - Alternatif siteler öner
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;

        if (!isValidYouTubeURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        const videoId = extractVideoId(url);
        
        // Direkt alternatif siteler öner
        res.json({
            error: 'YouTube MP3 dönüştürme servisi şu anda kullanılamıyor',
            message: 'Aşağıdaki alternatif sitelerden birini kullanabilirsiniz:',
            alternatives: [
                {
                    name: 'Y2mate',
                    url: `https://www.y2mate.com/youtube/${videoId}`,
                    description: 'Popüler YouTube MP3 dönüştürücü'
                },
                {
                    name: 'YTMP3',
                    url: 'https://ytmp3.cc/youtube-to-mp3/',
                    description: 'Hızlı ve basit MP3 dönüştürücü'
                },
                {
                    name: 'MP3Download',
                    url: 'https://mp3download.to/',
                    description: 'Ücretsiz YouTube MP3 indirici'
                },
                {
                    name: 'Loader.to',
                    url: 'https://loader.to/tr/youtube-mp3-downloader/',
                    description: 'Türkçe YouTube MP3 dönüştürücü'
                }
            ],
            videoId: videoId,
            originalUrl: url
        });

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