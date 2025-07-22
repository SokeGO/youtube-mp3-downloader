#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json
import shutil

def try_pytube(url, output_path):
    """Pytube ile indirme denemesi"""
    try:
        from pytube import YouTube
        print("Pytube ile deneniyor...")
        
        yt = YouTube(url)
        title = yt.title
        
        # Ses stream'ini al
        audio_stream = yt.streams.filter(only_audio=True).first()
        
        if audio_stream:
            print(f"Pytube - Video: {title}")
            filename = f"{title}.mp4"
            filepath = audio_stream.download(output_path=output_path, filename=filename)
            
            # MP3 olarak yeniden adlandır
            mp3_path = os.path.join(output_path, f"{title}.mp3")
            shutil.move(filepath, mp3_path)
            
            file_size = os.path.getsize(mp3_path)
            
            if file_size > 50000:
                return {
                    'success': True,
                    'filename': f"{title}.mp3",
                    'title': title,
                    'duration': yt.length,
                    'path': mp3_path,
                    'size': file_size,
                    'method': 'pytube'
                }
        
        return None
    except Exception as e:
        print(f"Pytube hatası: {str(e)}")
        return None

def try_yt_dlp_simple(url, output_path):
    """En basit yt-dlp denemesi"""
    try:
        print("Basit yt-dlp deneniyor...")
        
        ydl_opts = {
            'format': 'bestaudio',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'quiet': False,
            'no_warnings': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if not info:
                return None
            
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
            print(f"Basit yt-dlp - Video: {title}")
            
            # Mevcut dosyaları temizle
            for file in os.listdir(output_path):
                if os.path.isfile(os.path.join(output_path, file)):
                    os.remove(os.path.join(output_path, file))
            
            ydl.download([url])
            
            # İndirilen dosyayı bul
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"Dosya: {file}, Boyut: {file_size} bytes")
                    
                    if file_size > 50000:
                        # MP3 uzantısıyla yeniden adlandır
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
                            'method': 'yt-dlp-simple'
                        }
        
        return None
    except Exception as e:
        print(f"Basit yt-dlp hatası: {str(e)}")
        return None

def download_audio(url, output_path):
    try:
        # Yöntem 1: Pytube dene
        result = try_pytube(url, output_path)
        if result:
            return result
        
        # Yöntem 2: Basit yt-dlp dene
        result = try_yt_dlp_simple(url, output_path)
        if result:
            return result
        
        # Yöntem 3: yt-dlp farklı client'lar
        methods = [
            {
                'format': 'bestaudio',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android']
                    }
                }
            },
            {
                'format': 'worst',
                'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
                'quiet': True,
                'extractor_args': {
                    'youtube': {
                        'player_client': ['ios']
                    }
                }
            }
        ]
        
        for i, ydl_opts in enumerate(methods, 1):
            try:
                print(f"yt-dlp Yöntem {i} deneniyor...")
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                    
                    if not info:
                        continue
                    
                    title = info.get('title', 'Unknown')
                    duration = info.get('duration', 0)
                    
                    # Mevcut dosyaları temizle
                    for file in os.listdir(output_path):
                        if os.path.isfile(os.path.join(output_path, file)):
                            os.remove(os.path.join(output_path, file))
                    
                    ydl.download([url])
                    
                    # İndirilen dosyayı kontrol et
                    for file in os.listdir(output_path):
                        file_path = os.path.join(output_path, file)
                        if os.path.isfile(file_path):
                            file_size = os.path.getsize(file_path)
                            
                            if file_size > 50000:
                                # MP3 uzantısıyla yeniden adlandır
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
                                    'method': f'yt-dlp-{i}'
                                }
                
            except Exception as e:
                print(f"yt-dlp Yöntem {i} hatası: {str(e)}")
                continue
        
        # Tüm yöntemler başarısız
        return {'success': False, 'error': 'YouTube erişimi tamamen engellendi. Alternatif siteler kullanın.'}
            
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