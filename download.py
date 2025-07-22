#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json

def download_audio(url, output_path):
    try:
        # En basit ayarlar - sadece çalışan kısım
        ydl_opts = {
            'format': 'bestaudio',
            'outtmpl': os.path.join(output_path, 'audio.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
        }
        
        print(f"İndirme başlıyor: {url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Video bilgilerini al
            info = ydl.extract_info(url, download=False)
            
            if not info:
                return {'success': False, 'error': 'Video bulunamadı'}
            
            title = info.get('title', 'YouTube Audio')
            duration = info.get('duration', 0)
            
            print(f"Video: {title}")
            
            # Mevcut dosyaları temizle
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    os.remove(file_path)
            
            # İndir
            ydl.download([url])
            
            # İndirilen dosyayı bul
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"Dosya: {file}, Boyut: {file_size} bytes")
                    
                    if file_size > 10000:  # 10KB'den büyükse
                        return {
                            'success': True,
                            'filename': file,
                            'title': title,
                            'duration': duration,
                            'path': file_path,
                            'size': file_size
                        }
            
            return {'success': False, 'error': 'Geçerli ses dosyası oluşturulamadı'}
            
    except Exception as e:
        print(f"Hata: {str(e)}")
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({'success': False, 'error': 'Parametreler eksik'}))
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    os.makedirs(output_path, exist_ok=True)
    
    result = download_audio(url, output_path)
    print(json.dumps(result))