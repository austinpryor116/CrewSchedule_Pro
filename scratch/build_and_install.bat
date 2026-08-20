@echo off
echo [1/3] Building Next.js application & exported static assets...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Next.js build failed! Exiting.
    exit /b %ERRORLEVEL%
)

echo [2/3] Syncing assets to Capacitor Android project...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed! Exiting.
    exit /b %ERRORLEVEL%
)

echo [3/3] Assembling standalone debug APK & installing to connected Android phone...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gradle build failed! Exiting.
    exit /b %ERRORLEVEL%
)

echo [SUCCESS] Installing app-debug.apk on connected device...
adb install -r app\build\outputs\apk\debug\app-debug.apk
echo [COMPLETE] Deployment completed successfully!
