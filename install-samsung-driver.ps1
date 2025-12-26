Write-Host "=== Samsung USB Driver Installer ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your Samsung phone is connected but needs proper drivers." -ForegroundColor Yellow
Write-Host ""

Write-Host "Option 1 - Download Official Samsung USB Driver:" -ForegroundColor Green
Write-Host "Opening Samsung driver download page..." -ForegroundColor Gray
Start-Process "https://developer.samsung.com/android-usb-driver"
Write-Host "  1. Click 'Download' button" -ForegroundColor White
Write-Host "  2. Run the installer" -ForegroundColor White
Write-Host "  3. Restart your computer" -ForegroundColor White
Write-Host ""

Write-Host "Option 2 - Quick Fix (Try this first):" -ForegroundColor Green
Write-Host "  1. On your phone: Settings -> Developer Options" -ForegroundColor White
Write-Host "  2. Scroll down to 'Select USB Configuration'" -ForegroundColor White
Write-Host "  3. Select 'MTP (Media Transfer Protocol)'" -ForegroundColor White
Write-Host "  4. Unplug and replug the USB cable" -ForegroundColor White
Write-Host "  5. Look for 'Allow USB debugging?' popup" -ForegroundColor White
Write-Host "     - Check 'Always allow from this computer'" -ForegroundColor White
Write-Host "     - Tap OK" -ForegroundColor White
Write-Host ""

Write-Host "Option 3 - Use Wireless ADB (No USB needed):" -ForegroundColor Green
Write-Host "  1. Connect phone and PC to same WiFi network" -ForegroundColor White
Write-Host "  2. On phone: Settings -> Developer Options" -ForegroundColor White
Write-Host "  3. Enable 'Wireless debugging'" -ForegroundColor White
Write-Host "  4. Tap 'Wireless debugging' to see IP address" -ForegroundColor White
Write-Host "  5. Run: adb connect YOUR_PHONE_IP:5555" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Which option? (1=Driver, 2=Try Quick Fix, 3=Wireless, Q=Quit)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "Waiting 30 seconds for you to change settings..." -ForegroundColor Yellow
    Write-Host "Do the steps above, then this script will check automatically." -ForegroundColor Yellow
    
    for ($i = 30; $i -gt 0; $i--) {
        Write-Host -NoNewline "`rTime remaining: $i seconds... "
        Start-Sleep -Seconds 1
    }
    
    Write-Host ""
    Write-Host "Checking for device..." -ForegroundColor Cyan
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server | Out-Null
    Start-Sleep -Seconds 1
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server | Out-Null
    Start-Sleep -Seconds 2
    
    $devices = & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
    Write-Host $devices
    
    $deviceLines = $devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
    if ($deviceLines) {
        Write-Host ""
        Write-Host "SUCCESS! Device detected!" -ForegroundColor Green
        Write-Host "Installing APK now..." -ForegroundColor Cyan
        .\install-apk.ps1
    } else {
        Write-Host ""
        Write-Host "Still not detected. Try Option 1 (install Samsung drivers)" -ForegroundColor Red
    }
} elseif ($choice -eq "3") {
    Write-Host ""
    Write-Host "Wireless ADB Setup:" -ForegroundColor Cyan
    Write-Host "1. Enable 'Wireless debugging' on your phone" -ForegroundColor White
    Write-Host "2. Find your phone's IP address in the Wireless debugging screen" -ForegroundColor White
    $ip = Read-Host "3. Enter your phone's IP address"
    
    if ($ip) {
        Write-Host "Connecting to $ip..." -ForegroundColor Yellow
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect "$ip:5555"
        Start-Sleep -Seconds 2
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
        
        Write-Host ""
        Write-Host "If you see your device above, run: .\install-apk.ps1" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "After fixing the connection, run: .\install-apk.ps1" -ForegroundColor Cyan
