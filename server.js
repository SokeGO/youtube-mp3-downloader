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
                lengthSeconds: 'Bilinmiyor', // oEmbed'de süre yok
                thumbnail: response.data.thumbnail_url
            };

            res.json(videoDetails);
        } catch (oembedError) {
            console.log('oEmbed hatası:', oembedError.message);
            // oEmbed başarısız olursa basit bilgi döndür
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
            exec(pythonCommand, { timeout: 180000 }, (error, stdout, stderr) => {
                console.log('Python stdout:', stdout);
                console.log('Python stderr:', stderr);

                if (error) {
                    console.error('Python execution error:', error);
                    reject(error);
                    return;
                }

                try {
                    // stdout'dan JSON kısmını ayıkla
                    const lines = stdout.trim().split('\n');
                    const jsonLine = lines[lines.length - 1]; // Son satır JSON olmalı
                    console.log('JSON line:', jsonLine);

                    const result = JSON.parse(jsonLine);
                    resolve(result);
                } catch (parseError) {
                    console.error('JSON parse hatası:', parseError);
                    console.error('Full stdout:', stdout);
                    reject(parseError);
                }
            });
        });

        if (!result.success) {
            // Bot koruması veya erişim engeli durumunda alternatif öner
            if (result.error && (result.error.includes('bot') || result.error.includes('engel'))) {
                const videoId = extractVideoId(url);
                return res.json({
                    error: 'YouTube erişimi engellendi',
                    message: 'Otomatik indirme şu anda mümkün değil. Alternatif siteler:',
                    alternatives: [
                        `https://y2mate.com/youtube/${videoId}`,
                        `https://ytmp3.cc/youtube-to-mp3/`,
                        `https://mp3download.to/`,
                        `https://loader.to/tr/youtube-mp3-downloader/`
                    ],
                    videoId: videoId
                });
            }
            throw new Error(result.error || 'İndirme başarısız');
        }

        tempFile = result.path;

        if (!fs.existsSync(tempFile)) {
            throw new Error('İndirilen dosya bulunamadı');
        }

        // Dosya boyutu kontrolü
        const fileStats = fs.statSync(tempFile);
        console.log(`Dosya boyutu: ${fileStats.size} bytes`);

        if (fileStats.size < 50000) { // 50KB'den küçükse
            throw new Error(`Dosya çok küçük (${fileStats.size} bytes). İndirme başarısız.`);
        }

        // Dosyayı streaming için hazırla
        const filename = result.title.replace(/[^\w\s-]/gi, '').substring(0, 50);
        const audioId = Date.now().toString(); // Unique ID
        
        // Dosyayı public klasörüne taşı (geçici olarak)
        const publicAudioPath = path.join(__dirname, 'public', 'audio', `${audioId}.mp3`);
        const audioDir = path.join(__dirname, 'public', 'audio');
        
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        
        fs.copyFileSync(tempFile, publicAudioPath);
        
        // Streaming bilgilerini döndür
        res.json({
            success: true,
            title: result.title,
            duration: result.duration,
            audioUrl: `/audio/${audioId}.mp3`,
            audioId: audioId,
            size: fileStats.size
        });

        // Orijinal temp dosyayı sil
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        // 10 dakika sonra public dosyayı da sil
        setTimeout(() => {
            if (fs.existsSync(publicAudioPath)) {
                fs.unlinkSync(publicAudioPath);
                console.log('Public audio dosyası silindi:', publicAudioPath);
            }
        }, 10 * 60 * 1000); // 10 dakika

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