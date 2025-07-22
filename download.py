#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json

def download_audio(url, output_path):
    try:
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Video bilgilerini al
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
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
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'success': False, 'error': 'Geçersiz parametreler'}))
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    result = download_audio(url, output_path)
    print(json.dumps(result))