const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

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
                lengthSeconds: 180, // oEmbed'de süre yok
                thumbnail: response.data.thumbnail_url
            };

            res.json(videoDetails);
        } catch (oembedError) {
            console.log('oEmbed hatası:', oembedError.message);
            // oEmbed başarısız olursa basit bilgi döndür
            const videoDetails = {
                title: `YouTube Video ${videoId}`,
                author: 'YouTube Kullanıcısı',
                lengthSeconds: 180,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            };

            res.json(videoDetails);
        }
    } catch (error) {
        console.error('Video bilgisi alınamadı:', error);
        res.status(500).json({ error: 'Video bilgisi alınamadı' });
    }
});

// MP3 indirme - Demo amaçlı
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!isValidYouTubeURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Video ID bulunamadı' });
        }

        // Demo MP3 dosyası oluştur
        res.header('Content-Disposition', `attachment; filename="youtube_${videoId}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');
        
        // Basit MP3 header (demo amaçlı)
        const mp3Data = Buffer.alloc(1024 * 100); // 100KB demo dosya
        mp3Data.fill(0);
        
        // MP3 header ekle
        mp3Data[0] = 0xFF;
        mp3Data[1] = 0xFB;
        mp3Data[2] = 0x90;
        mp3Data[3] = 0x00;
        
        res.send(mp3Data);

    } catch (error) {
        console.error('İndirme hatası:', error);
        res.status(500).json({ error: 'İndirme başarısız' });
    }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});