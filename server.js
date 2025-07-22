const express = require('express');
const ytdl = require('ytdl-core');
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

        const info = await ytdl.getInfo(url);
        const videoDetails = {
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            lengthSeconds: info.videoDetails.lengthSeconds,
            thumbnail: info.videoDetails.thumbnails[0]?.url
        };

        res.json(videoDetails);
    } catch (error) {
        console.error('Video bilgisi alınamadı:', error);
        res.status(500).json({ error: 'Video bilgisi alınamadı' });
    }
});

// MP3 indirme
app.post('/api/download', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Geçersiz YouTube URL' });
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
        }).pipe(res);

    } catch (error) {
        console.error('İndirme hatası:', error);
        res.status(500).json({ error: 'İndirme başarısız' });
    }
});

app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});