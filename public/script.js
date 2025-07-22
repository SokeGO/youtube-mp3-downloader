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
                // Eğer alternatif URL varsa göster
                if (data.alternativeUrl) {
                    this.downloadProgress.classList.add('hidden');
                    this.videoInfo.classList.remove('hidden');
                    this.showAlternativeDownload(data);
                    return;
                }
                throw new Error(data.error || 'İndirme başarısız');
            }

            // Normal dosya indirme
            if (response.headers.get('content-type') === 'audio/mpeg') {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${this.videoTitle.textContent}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);

                this.downloadProgress.classList.add('hidden');
                this.videoInfo.classList.remove('hidden');
                this.showSuccess('İndirme tamamlandı!');
            }

        } catch (error) {
            this.downloadProgress.classList.add('hidden');
            this.showError(error.message);
        }
    }

    showAlternativeDownload(data) {
        const alternativeDiv = document.createElement('div');
        alternativeDiv.className = 'alternative-download';
        alternativeDiv.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ffeaa7;
            margin: 20px 0;
            text-align: center;
        `;
        
        alternativeDiv.innerHTML = `
            <h4>Otomatik İndirme Kullanılamıyor</h4>
            <p>${data.message}</p>
            <a href="${data.alternativeUrl}" target="_blank" 
               style="display: inline-block; margin-top: 10px; padding: 10px 20px; 
                      background: #007bff; color: white; text-decoration: none; 
                      border-radius: 5px;">
                Manuel İndirme Sayfasını Aç
            </a>
        `;
        
        this.videoInfo.insertBefore(alternativeDiv, this.videoInfo.firstChild);
        
        setTimeout(() => {
            alternativeDiv.remove();
        }, 10000);
    }

    displayVideoInfo(data) {
        this.thumbnail.src = data.thumbnail;
        this.videoTitle.textContent = data.title;
        this.videoAuthor.textContent = `Kanal: ${data.author}`;
        this.videoDuration.textContent = `Süre: ${this.formatDuration(data.lengthSeconds)}`;
        
        this.videoInfo.classList.remove('hidden');
    }

    formatDuration(seconds) {
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