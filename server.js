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

// MP3 indirme - Python yt-dlp kullanarak
app.post('/api/download', async (req, res) => {
    const tempDir = path.join(__dirname, 'temp');
    let tempFile = null;

    try {
        const { url } = req.body;
        
        if (!isValidYouTubeURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        // Temp klasörü oluştur
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Python script'ini çalıştır
        const pythonCommand = `python3 download.py "${url}" "${tempDir}"`;
        
        console.log('Python komutu çalıştırılıyor:', pythonCommand);

        const result = await new Promise((resolve, reject) => {
            exec(pythonCommand, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Python hatası:', error);
                    console.error('stderr:', stderr);
                    reject(error);
                    return;
                }
                
                try {
                    const result = JSON.parse(stdout.trim());
                    resolve(result);
                } catch (parseError) {
                    console.error('JSON parse hatası:', parseError);
                    console.error('stdout:', stdout);
                    reject(parseError);
                }
            });
        });

        if (!result.success) {
            throw new Error(result.error || 'İndirme başarısız');
        }

        tempFile = result.path;
        
        if (!fs.existsSync(tempFile)) {
            throw new Error('İndirilen dosya bulunamadı');
        }

        // Dosyayı kullanıcıya gönder
        const filename = result.title.replace(/[^\w\s-]/gi, '').substring(0, 50) + '.mp3';
        
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        res.header('Content-Type', 'audio/mpeg');
        
        const fileStream = fs.createReadStream(tempFile);
        fileStream.pipe(res);

        // Stream bittiğinde dosyayı sil
        fileStream.on('end', () => {
            setTimeout(() => {
                if (tempFile && fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                    console.log('Temp dosya silindi:', tempFile);
                }
            }, 1000);
        });

        fileStream.on('error', (error) => {
            console.error('Stream hatası:', error);
            if (tempFile && fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        });

    } catch (error) {
        console.error('İndirme hatası:', error);
        
        // Hata durumunda temp dosyayı temizle
        if (tempFile && fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'İndirme başarısız: ' + error.message });
        }
    }
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});