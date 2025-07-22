#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import time
import random

def download_audio(url, output_path):
    try:
        # Farklı yöntemler sırayla dene
        methods = [
            # Yöntem 1: Android client
            {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '96',
                }],
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            # Yöntem 2: iOS client
            {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '96',
                }],
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios']
                    }
                }
            },
            # Yöntem 3: Web client with bypass
            {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '96',
                }],
                'quiet': True,
                'no_warnings': True,
                'user_agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'extractor_args': {
                    'youtube': {
                        'player_client': ['web'],
                        'skip': ['hls', 'dash']
                    }
                }
            },
            # Yöntem 4: TV client
            {
                'format': 'worst[ext=mp4]/worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '96',
                }],
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['tv_embedded']
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
                    
                    # İndir
                    ydl.download([url])
                    
                    # İndirilen dosyayı bul
                    for file in os.listdir(output_path):
                        if file.endswith('.mp3'):
                            file_path = os.path.join(output_path, file)
                            file_size = os.path.getsize(file_path)
                            print(f"Başarılı! MP3: {file}, Boyut: {file_size} bytes")
                            
                            return {
                                'success': True,
                                'filename': file,
                                'title': title,
                                'duration': duration,
                                'path': file_path,
                                'method': i
                            }
                
                print(f"Yöntem {i} - MP3 dosyası oluşturulamadı")
                
            except Exception as e:
                print(f"Yöntem {i} hatası: {str(e)}")
                continue
        
        # Tüm yöntemler başarısız
        return {'success': False, 'error': 'Tüm indirme yöntemleri başarısız. YouTube bot koruması aktif.'}
            
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