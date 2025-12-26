#!/usr/bin/env pwsh

Write-Host "Civitron APK Installation Helper" -ForegroundColor Cyan
Write-Host ""

$apkPath = Join-Path $PSScriptRoot "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "APK not found. Building first..." -ForegroundColor Red
    Set-Location (Join-Path $PSScriptRoot "android")
    .\gradlew.bat assembleDebug --no-daemon
    Set-Location $PSScriptRoot
}

if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "APK ready:" ([math]::Round($apkSize, 2)) "MB" -ForegroundColor Green
    Write-Host "Location: $apkPath" -ForegroundColor Yellow
    Write-Host ""
    
    # Try ADB install
    $adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        Write-Host "Checking for connected device..." -ForegroundColor Cyan
        & $adbPath devices
        
        $devices = & $adbPath devices | Select-String "device$"
        if ($devices) {
            Write-Host ""
            Write-Host "Installing via ADB..." -ForegroundColor Green
            & $adbPath install -r $apkPath
            Write-Host ""
            Write-Host "Done! Launch Civitron app on your phone" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "No device detected via ADB" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Manual installation steps:" -ForegroundColor Cyan
            Write-Host "1. Connect phone in File Transfer mode"
            Write-Host "2. Copy APK to phone Downloads folder"
            Write-Host "3. On phone: Open Files -> Downloads -> tap app-debug.apk"
            Write-Host "4. Allow Install unknown apps if prompted"
            Write-Host "5. Tap Install"
            Write-Host ""
            
            # Open folder for easy copy
            Start-Process explorer.exe "/select,$apkPath"
        }
    }
} else {
    Write-Host "Build failed" -ForegroundColor Red
}
