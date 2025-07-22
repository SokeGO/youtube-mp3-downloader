@echo off
echo YouTube MP3 Downloader - Heroku Deploy Script
echo.

echo 1. Git repository olusturuluyor...
git init
git add .
git commit -m "YouTube MP3 downloader initial commit"

echo.
echo 2. Heroku app olusturuluyor...
set /p APP_NAME="Heroku app ismi girin (bos birakabilirsiniz): "
if "%APP_NAME%"=="" (
    heroku create
) else (
    heroku create %APP_NAME%
)

echo.
echo 3. Heroku'ya deploy ediliyor...
git push heroku main

echo.
echo 4. App aciliyor...
heroku open

echo.
echo Deploy tamamlandi!
pause