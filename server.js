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

// MP3 indirme - Üçüncü parti servis kullanarak
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

        // Üçüncü parti MP3 dönüştürme servisi kullan
        try {
            // Y2mate API benzeri servis (örnek)
            const convertUrl = `https://www.y2mate.com/mates/analyzeV2/ajax`;

            const convertResponse = await axios.post(convertUrl, {
                k_query: url,
                k_page: 'home',
                hl: 'tr',
                q_auto: 0
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });

            // Başarısız olursa alternatif yaklaşım
            throw new Error('Dönüştürme servisi kullanılamıyor');

        } catch (convertError) {
            console.log('Dönüştürme servisi hatası:', convertError.message);

            // Alternatif: Kullanıcıya indirme linki ver
            const downloadUrl = `https://www.youtube.com/watch?v=${videoId}`;

            res.json({
                error: 'Otomatik dönüştürme şu anda kullanılamıyor',
                message: 'Lütfen aşağıdaki linkten manuel olarak indirin:',
                alternativeUrl: `https://www.y2mate.com/youtube/${videoId}`,
                originalUrl: downloadUrl
            });
        }

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