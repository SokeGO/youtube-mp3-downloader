class YouTubeDownloader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.urlInput = document.getElementById('urlInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.loading = document.getElementById('loading');
        this.videoInfo = document.getElementById('videoInfo');
        this.downloadProgress = document.getElementById('downloadProgress');
        this.error = document.getElementById('error');
        this.thumbnail = document.getElementById('thumbnail');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoAuthor = document.getElementById('videoAuthor');
        this.videoDuration = document.getElementById('videoDuration');
        this.downloadBtn = document.getElementById('downloadBtn');
    }

    bindEvents() {
        this.searchBtn.addEventListener('click', () => this.searchVideo());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchVideo();
        });
        this.downloadBtn.addEventListener('click', () => this.downloadVideo());
    }

    async searchVideo() {
        const url = this.urlInput.value.trim();

        if (!url) {
            this.showError('Lütfen bir YouTube URL\'si girin');
            return;
        }

        if (!this.isValidYouTubeURL(url)) {
            this.showError('Geçerli bir YouTube URL\'si girin');
            return;
        }

        this.hideAll();
        this.loading.classList.remove('hidden');

        try {
            const response = await fetch('/api/video-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Video bilgisi alınamadı');
            }

            this.displayVideoInfo(data);
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.loading.classList.add('hidden');
        }
    }

    async downloadVideo() {
        const url = this.urlInput.value.trim();

        this.hideAll();
        this.downloadProgress.classList.remove('hidden');

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (!response.ok) {
                // Alternatif linkler varsa göster
                if (data.alternatives) {
                    this.showAlternatives(data);
                    return;
                }

                throw new Error(data.error || 'İşlem başarısız');
            }

            // Streaming player'ı göster
            this.showAudioPlayer(data);

        } catch (error) {
            this.downloadProgress.classList.add('hidden');
            this.showError(error.message);
        }
    }

    showAudioPlayer(data) {
        this.downloadProgress.classList.add('hidden');

        const playerDiv = document.createElement('div');
        playerDiv.className = 'audio-player';
        playerDiv.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin: 20px 0;
            text-align: center;
        `;

        const title = data.title || 'YouTube Audio';
        const audioUrl = data.audioUrl;
        const fileSize = data.size ? (data.size / 1024 / 1024).toFixed(2) : 'Bilinmiyor';

        playerDiv.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #333;">${title}</h3>
            <audio controls style="width: 100%; max-width: 500px; margin: 20px 0;">
                <source src="${audioUrl}" type="audio/mpeg">
                Tarayıcınız ses dosyasını desteklemiyor.
            </audio>
            <div style="margin-top: 20px;">
                <p style="color: #666; font-size: 14px;">
                    Dosya Boyutu: ${fileSize} MB
                </p>
                <a href="${audioUrl}" download="${title}.mp3" 
                   style="display: inline-block; margin-top: 10px; padding: 10px 20px; 
                          background: #28a745; color: white; text-decoration: none; 
                          border-radius: 5px;">
                    💾 İndir
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 10px;">
                    ⏰ Bu dosya 10 dakika sonra silinecek
                </p>
            </div>
        `;

        // Mevcut player'ları temizle
        const existingPlayers = document.querySelectorAll('.audio-player');
        existingPlayers.forEach(player => player.remove());

        // Yeni player'ı ekle
        this.videoInfo.appendChild(playerDiv);
        this.videoInfo.classList.remove('hidden');

        this.showSuccess('🎵 Ses dosyası hazır! Dinleyebilir veya indirebilirsiniz.');
    }

    showAlternatives(data) {
        this.downloadProgress.classList.add('hidden');
        
        const alternativeDiv = document.createElement('div');
        alternativeDiv.className = 'alternative-download';
        alternativeDiv.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin: 20px 0;
            text-align: center;
        `;
        
        let alternativeLinks = '';
        if (data.alternatives && Array.isArray(data.alternatives)) {
            data.alternatives.forEach((alt, index) => {
                if (typeof alt === 'object' && alt.name && alt.url) {
                    alternativeLinks += `
                        <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <h4 style="margin: 0 0 5px 0; color: #333;">${alt.name}</h4>
                            <p style="margin: 5px 0; color: #666; font-size: 14px;">${alt.description}</p>
                            <a href="${alt.url}" target="_blank" 
                               style="display: inline-block; margin-top: 10px; padding: 10px 20px; 
                                      background: #007bff; color: white; text-decoration: none; 
                                      border-radius: 5px; font-weight: bold;">
                                🔗 ${alt.name} ile İndir
                            </a>
                        </div>
                    `;
                } else {
                    alternativeLinks += `
                        <a href="${alt}" target="_blank" 
                           style="display: inline-block; margin: 5px 10px; padding: 10px 15px; 
                                  background: #007bff; color: white; text-decoration: none; 
                                  border-radius: 5px; font-size: 14px;">
                            Alternatif ${index + 1}
                        </a>
                    `;
                }
            });
        }
        
        alternativeDiv.innerHTML = `
            <h3 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Otomatik İndirme Kullanılamıyor</h3>
            <p style="color: #666; margin-bottom: 20px;">${data.message}</p>
            <div style="margin-top: 20px;">
                ${alternativeLinks}
            </div>
            <div style="margin-top: 30px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
                <p style="color: #31708f; font-size: 14px; margin: 0;">
                    💡 <strong>Nasıl Kullanılır:</strong><br>
                    1. Yukarıdaki sitelerden birini seçin<br>
                    2. YouTube URL'sini yapıştırın<br>
                    3. MP3 formatını seçip indirin
                </p>
            </div>
        `;
        
        // Mevcut içerikleri temizle
        const existingAlternatives = document.querySelectorAll('.alternative-download');
        existingAlternatives.forEach(alt => alt.remove());
        
        // Yeni alternatif bölümünü ekle
        this.videoInfo.appendChild(alternativeDiv);
        this.videoInfo.classList.remove('hidden');
    }

    showAlternatives(data) {
        const alternativeDiv = document.createElement('div');
        alternativeDiv.className = 'alternative-download';
        alternativeDiv.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
            text-align: center;
        `;

        let alternativeLinks = '';
        data.alternatives.forEach((link, index) => {
            alternativeLinks += `
                <a href="${link}" target="_blank" 
                   style="display: inline-block; margin: 5px 10px; padding: 10px 15px; 
                          background: #007bff; color: white; text-decoration: none; 
                          border-radius: 5px; font-size: 14px;">
                    Alternatif ${index + 1}
                </a>
            `;
        });

        alternativeDiv.innerHTML = `
            <h4>🤖 YouTube Bot Koruması Aktif</h4>
            <p>${data.message}</p>
            <div style="margin-top: 15px;">
                ${alternativeLinks}
            </div>
            <p style="font-size: 12px; margin-top: 10px; opacity: 0.8;">
                Bu siteler üzerinden manuel olarak indirebilirsiniz
            </p>
        `;

        this.videoInfo.insertBefore(alternativeDiv, this.videoInfo.firstChild);

        setTimeout(() => {
            alternativeDiv.remove();
        }, 15000);
    }

    displayVideoInfo(data) {
        this.thumbnail.src = data.thumbnail;
        this.videoTitle.textContent = data.title;
        this.videoAuthor.textContent = `Kanal: ${data.author}`;
        this.videoDuration.textContent = `Süre: ${this.formatDuration(data.lengthSeconds)}`;

        this.videoInfo.classList.remove('hidden');
    }

    formatDuration(seconds) {
        if (typeof seconds === 'string') {
            return seconds; // "Bilinmiyor" gibi string değerler için
        }
        if (!seconds || seconds === 0) {
            return 'Bilinmiyor';
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    isValidYouTubeURL(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        return youtubeRegex.test(url);
    }

    showError(message) {
        this.error.textContent = message;
        this.error.classList.remove('hidden');
        setTimeout(() => {
            this.error.classList.add('hidden');
        }, 5000);
    }

    showSuccess(message) {
        // Geçici başarı mesajı göster
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #c3e6cb;
            margin-bottom: 20px;
        `;
        successDiv.textContent = message;

        this.videoInfo.insertBefore(successDiv, this.videoInfo.firstChild);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    hideAll() {
        this.loading.classList.add('hidden');
        this.videoInfo.classList.add('hidden');
        this.downloadProgress.classList.add('hidden');
        this.error.classList.add('hidden');
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeDownloader();
});