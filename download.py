#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import time
import random

def download_audio_simple(url, output_path):
    """Basit ayarlarla indirme denemesi"""
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                return None
                
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
            ydl.download([url])
            
            # İndirilen dosyayı bul
            for file in os.listdir(output_path):
                if file.endswith('.mp3'):
                    return {
                        'success': True,
                        'filename': file,
                        'title': title,
                        'duration': duration,
                        'path': os.path.join(output_path, file)
                    }
            return None
    except:
        return None

def download_audio(url, output_path):
    try:
        # Önce basit yöntemle dene
        result = download_audio_simple(url, output_path)
        if result:
            return result
            
        # Basit yöntem başarısız olursa gelişmiş yöntemle dene
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'quiet': True,
            'no_warnings': True,
            'ignoreerrors': True,
            'user_agent': random.choice(user_agents),
            'referer': 'https://www.youtube.com/',
            'headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'skip': ['hls', 'dash']
                }
            },
            'http_headers': {
                'User-Agent': random.choice(user_agents)
            }
        }
        
        # Kısa bekleme süresi ekle
        time.sleep(random.uniform(1, 3))
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # Video bilgilerini al
                info = ydl.extract_info(url, download=False)
                
                if info is None:
                    return {'success': False, 'error': 'Video bilgisi alınamadı. Video mevcut değil veya erişilebilir değil.'}
                
                title = info.get('title', 'Unknown') if info else 'Unknown'
                duration = info.get('duration', 0) if info else 0
                
                # İndir
                ydl.download([url])
                
                # İndirilen dosyayı bul
                for file in os.listdir(output_path):
                    if file.endswith('.mp3'):
                        return {
                            'success': True,
                            'filename': file,
                            'title': title,
                            'duration': duration,
                            'path': os.path.join(output_path, file)
                        }
                
                return {'success': False, 'error': 'MP3 dosyası bulunamadı'}
                
            except yt_dlp.utils.DownloadError as e:
                error_msg = str(e)
                if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
                    return {'success': False, 'error': 'YouTube bot koruması aktif. Lütfen daha sonra tekrar deneyin.'}
                else:
                    return {'success': False, 'error': f'İndirme hatası: {error_msg}'}
            
    except Exception as e:
        return {'success': False, 'error': f'Genel hata: {str(e)}'}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'success': False, 'error': 'Geçersiz parametreler'}))
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    result = download_audio(url, output_path)
    print(json.dumps(result))