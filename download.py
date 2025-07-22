#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import shutil

def download_audio(url, output_path):
    try:
        # FFmpeg olmadan direkt ses formatı indirme
        methods = [
            # Yöntem 1: Direkt MP3 formatı (FFmpeg'siz)
            {
                'format': 'bestaudio[ext=mp3]',
                'outtmpl': os.path.join(output_path, '%(title)s.mp3'),
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            # Yöntem 2: M4A formatı (FFmpeg'siz)
            {
                'format': 'bestaudio[ext=m4a]',
                'outtmpl': os.path.join(output_path, '%(title)s.m4a'),
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            # Yöntem 3: WebM formatı (FFmpeg'siz)
            {
                'format': 'bestaudio[ext=webm]',
                'outtmpl': os.path.join(output_path, '%(title)s.webm'),
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            # Yöntem 4: En iyi ses formatı (FFmpeg'siz)
            {
                'format': 'bestaudio',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
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
                        if file.endswith(('.mp3', '.m4a', '.webm', '.mp4', '.opus')):
                            os.remove(os.path.join(output_path, file))
                    
                    # İndir
                    print(f"Yöntem {i} - İndirme başlıyor...")
                    ydl.download([url])
                    
                    # İndirilen dosyayı kontrol et
                    print(f"Yöntem {i} - Dosyalar kontrol ediliyor...")
                    for file in os.listdir(output_path):
                        print(f"Bulunan dosya: {file}")
                        file_path = os.path.join(output_path, file)
                        
                        if os.path.isfile(file_path):
                            file_size = os.path.getsize(file_path)
                            print(f"Dosya: {file}, Boyut: {file_size} bytes")
                            
                            # Dosya boyutu kontrolü
                            if file_size < 50000:  # 50KB'den küçükse
                                print(f"Dosya çok küçük ({file_size} bytes), siliniyor...")
                                os.remove(file_path)
                                continue
                            
                            # Ses dosyası ise kabul et
                            if file.endswith(('.mp3', '.m4a', '.webm', '.opus')):
                                # Dosyayı .mp3 uzantısıyla yeniden adlandır (tarayıcı uyumluluğu için)
                                if not file.endswith('.mp3'):
                                    new_name = os.path.splitext(file)[0] + '.mp3'
                                    new_path = os.path.join(output_path, new_name)
                                    shutil.move(file_path, new_path)
                                    file = new_name
                                    file_path = new_path
                                
                                return {
                                    'success': True,
                                    'filename': file,
                                    'title': title,
                                    'duration': duration,
                                    'path': file_path,
                                    'size': file_size,
                                    'method': i,
                                    'format': os.path.splitext(file)[1]
                                }
                
                print(f"Yöntem {i} - Geçerli ses dosyası bulunamadı")
                
            except Exception as e:
                print(f"Yöntem {i} hatası: {str(e)}")
                continue
        
        # Tüm yöntemler başarısız
        return {'success': False, 'error': 'Tüm indirme yöntemleri başarısız. YouTube ses formatlarına erişim engellendi.'}
            
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