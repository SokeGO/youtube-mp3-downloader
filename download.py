#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import time

def download_audio(url, output_path):
    try:
        # En basit ve güvenilir ayarlar
        ydl_opts = {
            'format': 'worst[ext=mp4]/worst',  # En düşük kalite - daha hızlı
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '96',  # Düşük kalite - hızlı işlem
            }],
            'quiet': False,  # Debug için açık
            'no_warnings': False,
            'extract_flat': False,
            'writeinfojson': False,
            'writethumbnail': False,
            'ignoreerrors': False,
        }
        
        print(f"İndirme başlıyor: {url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Video bilgilerini al
            print("Video bilgileri alınıyor...")
            info = ydl.extract_info(url, download=False)
            
            if not info:
                return {'success': False, 'error': 'Video bilgisi alınamadı'}
            
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
            print(f"Video: {title}, Süre: {duration}")
            
            # İndir
            print("İndirme başlıyor...")
            ydl.download([url])
            
            # İndirilen dosyayı bul
            print("İndirilen dosya aranıyor...")
            for file in os.listdir(output_path):
                print(f"Dosya bulundu: {file}")
                if file.endswith('.mp3'):
                    file_path = os.path.join(output_path, file)
                    file_size = os.path.getsize(file_path)
                    print(f"MP3 dosyası: {file}, Boyut: {file_size} bytes")
                    
                    return {
                        'success': True,
                        'filename': file,
                        'title': title,
                        'duration': duration,
                        'path': file_path,
                        'size': file_size
                    }
            
            return {'success': False, 'error': 'MP3 dosyası oluşturulamadı'}
            
    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e)
        print(f"yt-dlp hatası: {error_msg}")
        return {'success': False, 'error': f'İndirme hatası: {error_msg}'}
    except Exception as e:
        error_msg = str(e)
        print(f"Genel hata: {error_msg}")
        return {'success': False, 'error': f'Sistem hatası: {error_msg}'}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'success': False, 'error': 'Geçersiz parametreler'}))
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    print(f"Parametreler - URL: {url}, Path: {output_path}")
    
    # Output klasörünü oluştur
    os.makedirs(output_path, exist_ok=True)
    
    result = download_audio(url, output_path)
    print(f"Sonuç: {result}")
    print(json.dumps(result))