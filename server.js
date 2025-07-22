const express = require('express');
const ytdl = require('@distube/ytdl-core');
const cors = require('cors');
const path = require('path');
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

// Video bilgilerini getir
app.post('/api/video-info', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        // Daha güvenilir agent kullan
        const agent = ytdl.createAgent([
            {
                "name": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        ]);

        const info = await ytdl.getInfo(url, { agent });
        const videoDetails = {
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            lengthSeconds: info.videoDetails.lengthSeconds,
            thumbnail: info.videoDetails.thumbnails[0]?.url || info.videoDetails.thumbnail?.thumbnails?.[0]?.url
        };

        res.json(videoDetails);
    } catch (error) {
        console.error('Video bilgisi alınamadı:', error);
        res.status(500).json({ error: 'Video bilgisi alınamadı: ' + error.message });
    }
});

// MP3 indirme
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        const agent = ytdl.createAgent([
            {
                "name": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        ]);

        const info = await ytdl.getInfo(url, { agent });
        const title = info.videoDetails.title.replace(/[^\w\s-]/gi, '').substring(0, 50);
        
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const audioStream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            agent: agent
        });

        audioStream.pipe(res);

        audioStream.on('error', (error) => {
            console.error('Stream hatası:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'İndirme başarısız' });
            }
        });

    } catch (error) {
        console.error('İndirme hatası:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'İndirme başarısız: ' + error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});