#!/usr/bin/env python3
import yt_dlp
import sys
import os
import json

def download_audio(url, output_path):
    try:
        print(f"URL: {url}")
        print(f"Output path: {output_path}")
        
        # En basit ayarlar
        ydl_opts = {
            'format': 'bestaudio',
            'outtmpl': os.path.join(output_path, 'audio.%(ext)s'),
            'quiet': False,  # Debug için açık
            'no_warnings': False,
        }
        
        print("yt-dlp başlatılıyor...")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print("Video bilgileri alınıyor...")
            info = ydl.extract_info(url, download=False)
            
            if not info:
                print("Video bilgisi alınamadı")
                return {'success': False, 'error': 'Video bulunamadı'}
            
            title = info.get('title', 'YouTube Audio')
            duration = info.get('duration', 0)
            
            print(f"Başlık: {title}")
            print(f"Süre: {duration}")
            
            # Mevcut dosyaları temizle
            for file in os.listdir(output_path):
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    print(f"Eski dosya siliniyor: {file}")
                    os.remove(file_path)
            
            print("İndirme başlıyor...")
            ydl.download([url])
            
            print("İndirme tamamlandı, dosyalar kontrol ediliyor...")
            
            # İndirilen dosyayı bul
            files = os.listdir(output_path)
            print(f"Klasördeki dosyalar: {files}")
            
            for file in files:
                file_path = os.path.join(output_path, file)
                if os.path.isfile(file_path):
                    file_size = os.path.getsize(file_path)
                    print(f"Dosya: {file}, Boyut: {file_size} bytes")
                    
                    if file_size > 1000:  # 1KB'den büyükse
                        print(f"Geçerli dosya bulundu: {file}")
                        return {
                            'success': True,
                            'filename': file,
                            'title': title,
                            'duration': duration,
                            'path': file_path,
                            'size': file_size
                        }
            
            print("Geçerli ses dosyası bulunamadı")
            return {'success': False, 'error': 'Ses dosyası oluşturulamadı'}
            
    except Exception as e:
        error_msg = str(e)
        print(f"Python hatası: {error_msg}")
        return {'success': False, 'error': error_msg}

if __name__ == '__main__':
    print("Python script başlatıldı")
    print(f"Argümanlar: {sys.argv}")
    
    if len(sys.argv) != 3:
        result = {'success': False, 'error': 'Parametreler eksik'}
        print(json.dumps(result))
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2]
    
    print(f"İşlem başlıyor - URL: {url}, Path: {output_path}")
    
    os.makedirs(output_path, exist_ok=True)
    
    result = download_audio(url, output_path)
    print(f"Sonuç: {result}")
    print(json.dumps(result))