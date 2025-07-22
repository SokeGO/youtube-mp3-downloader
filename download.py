#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import time

def download_audio(url, output_path):
    try:
        # Farklı yöntemler sırayla dene
        methods = [
            # Yöntem 1: Direkt MP3 formatı ara
            {
                'format': 'bestaudio[ext=mp3]/bestaudio[ext=m4a]/bestaudio',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'prefer_ffmpeg': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '128',
                }],
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            # Yöntem 2: iOS client
            {
                'format': 'bestaudio[ext=m4a]/bestaudio',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'prefer_ffmpeg': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '128',
                }],
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios']
                    }
                }
            },
            # Yöntem 3: Web client
            {
                'format': 'bestaudio/best',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'prefer_ffmpeg': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '128',
                }],
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web']
                    }
                }
            }
        ]
        
        for i, ydl_opts in enumerate(methods, 1):
            try:
                print(f"Yöntem {i} deneniyor...")
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    # Video bilgilerini al
                    info = ydl.extract_info(url, download=False)
                    
                    if not info:
                        print(f"Yöntem {i} - Video bilgisi alınamadı")
                        continue
                    
                    title = info.get('title', 'Unknown')
                    duration = info.get('duration', 0)
                    
                    print(f"Yöntem {i} - Video: {title}, Süre: {duration}")
                    
                    # Mevcut dosyaları temizle
                    for file in os.listdir(output_path):
                        if file.endswith(('.mp3', '.m4a', '.webm', '.mp4')):
                            os.remove(os.path.join(output_path, file))
                    
                    # İndir
                    print(f"Yöntem {i} - İndirme başlıyor...")
                    ydl.download([url])
                    
                    # İndirilen dosyayı kontrol et
                    print(f"Yöntem {i} - Dosyalar kontrol ediliyor...")
                    for file in os.listdir(output_path):
                        print(f"Bulunan dosya: {file}")
                        if file.endswith('.mp3'):
                            file_path = os.path.join(output_path, file)
                            file_size = os.path.getsize(file_path)
                            print(f"MP3 dosyası: {file}, Boyut: {file_size} bytes")
                            
                            # Dosya boyutu kontrolü
                            if file_size < 10000:  # 10KB'den küçükse
                                print(f"Dosya çok küçük ({file_size} bytes), siliniyor...")
                                os.remove(file_path)
                                continue
                            
                            return {
                                'success': True,
                                'filename': file,
                                'title': title,
                                'duration': duration,
                                'path': file_path,
                                'size': file_size,
                                'method': i
                            }
                
                print(f"Yöntem {i} - Geçerli MP3 dosyası bulunamadı")
                
            except Exception as e:
                print(f"Yöntem {i} hatası: {str(e)}")
                continue
        
        # Tüm yöntemler başarısız - son çare olarak video formatını dene
        try:
            print("Son çare: Video formatı deneniyor...")
            ydl_opts = {
                'format': 'worst[height<=360]/worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': False,
                'no_warnings': False,
                'prefer_ffmpeg': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '96',
                }],
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info:
                    title = info.get('title', 'Unknown')
                    duration = info.get('duration', 0)
                    
                    # Mevcut dosyaları temizle
                    for file in os.listdir(output_path):
                        if file.endswith(('.mp3', '.m4a', '.webm', '.mp4')):
                            os.remove(os.path.join(output_path, file))
                    
                    ydl.download([url])
                    
                    for file in os.listdir(output_path):
                        if file.endswith('.mp3'):
                            file_path = os.path.join(output_path, file)
                            file_size = os.path.getsize(file_path)
                            
                            if file_size >= 10000:  # En az 10KB
                                return {
                                    'success': True,
                                    'filename': file,
                                    'title': title,
                                    'duration': duration,
                                    'path': file_path,
                                    'size': file_size,
                                    'method': 'fallback'
                                }
        except Exception as e:
            print(f"Son çare hatası: {str(e)}")
        
        # Tüm yöntemler başarısız
        return {'success': False, 'error': 'Tüm indirme yöntemleri başarısız. YouTube bot koruması veya FFmpeg sorunu.'}
            
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
    
    print(f"URL: {url}")
    print(f"Output: {output_path}")
    
    # Output klasörünü oluştur
    os.makedirs(output_path, exist_ok=True)
    
    result = download_audio(url, output_path)
    print(f"Final Result: {result}")
    print(json.dumps(result))