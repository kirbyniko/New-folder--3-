Write-Host "=== Samsung ADB Driver Fix ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your Samsung phone is connected with ADB interface, but driver status is 'Unknown'" -ForegroundColor Yellow
Write-Host ""

Write-Host "QUICK FIX - Try this first:" -ForegroundColor Green
Write-Host ""
Write-Host "Step 1: Update Driver in Device Manager" -ForegroundColor White
Write-Host "  Opening Device Manager now..." -ForegroundColor Gray
Start-Process devmgmt.msc
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "  In Device Manager:" -ForegroundColor Cyan
Write-Host "  1. Look for 'SAMSUNG Android ADB Interface' (might be under 'Other devices' or 'Android Phone')" -ForegroundColor White
Write-Host "  2. Right-click it -> 'Update driver'" -ForegroundColor White
Write-Host "  3. Choose 'Search automatically for drivers'" -ForegroundColor White
Write-Host "  4. Wait for Windows to find and install the driver" -ForegroundColor White
Write-Host ""
Write-Host "  OR if that doesn't work:" -ForegroundColor Yellow
Write-Host "  1. Right-click 'SAMSUNG Android ADB Interface'" -ForegroundColor White
Write-Host "  2. Choose 'Update driver' -> 'Browse my computer for drivers'" -ForegroundColor White
Write-Host "  3. Choose 'Let me pick from a list of available drivers'" -ForegroundColor White
Write-Host "  4. Select 'Android Device' or 'Android ADB Interface'" -ForegroundColor White
Write-Host "  5. Click Next to install" -ForegroundColor White
Write-Host ""

$response = Read-Host "Press Enter after you've updated the driver (or type 'skip' to try wireless ADB)"

if ($response -ne "skip") {
    Write-Host ""
    Write-Host "Restarting ADB and checking for devices..." -ForegroundColor Cyan
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server | Out-Null
    Start-Sleep -Seconds 1
    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server | Out-Null
    Start-Sleep -Seconds 2
    
    Write-Host ""
    $devices = & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
    Write-Host $devices
    
    $deviceLines = $devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
    if ($deviceLines) {
        Write-Host ""
        Write-Host "SUCCESS! Your Samsung device is now connected!" -ForegroundColor Green
        Write-Host "Installing APK now..." -ForegroundColor Cyan
        Write-Host ""
        Start-Sleep -Seconds 2
        
        $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            Write-Host "Installing Civitron app..." -ForegroundColor Yellow
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r $apkPath
            Write-Host ""
            Write-Host "DONE! Check your phone - the Civitron app should now be installed!" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "Still not detected. Let's try Wireless ADB instead..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Wireless ADB Setup:" -ForegroundColor Cyan
        Write-Host "1. On your phone: Settings -> Developer Options" -ForegroundColor White
        Write-Host "2. Enable 'Wireless debugging'" -ForegroundColor White
        Write-Host "3. Tap 'Wireless debugging' to see your IP address and port" -ForegroundColor White
        Write-Host ""
        $ip = Read-Host "4. Enter your phone's IP address (e.g., 192.168.1.100)"
        $port = Read-Host "5. Enter the port (usually 5555 or shown on phone)"
        
        if ($ip -and $port) {
            Write-Host ""
            Write-Host "Connecting to $ip`:$port..." -ForegroundColor Yellow
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect "$ip`:$port"
            Start-Sleep -Seconds 3
            
            $devices = & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
            Write-Host $devices
            
            $deviceLines = $devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
            if ($deviceLines) {
                Write-Host ""
                Write-Host "SUCCESS! Connected wirelessly!" -ForegroundColor Green
                Write-Host "Installing APK..." -ForegroundColor Cyan
                
                $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
                if (Test-Path $apkPath) {
                    & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r $apkPath
                    Write-Host ""
                    Write-Host "DONE! Civitron app installed!" -ForegroundColor Green
                }
            }
        }
    }
} else {
    Write-Host ""
    Write-Host "Wireless ADB Setup:" -ForegroundColor Cyan
    Write-Host "1. On your phone: Settings -> Developer Options" -ForegroundColor White
    Write-Host "2. Enable 'Wireless debugging'" -ForegroundColor White
    Write-Host "3. Tap 'Wireless debugging' to see IP and port" -ForegroundColor White
    $ip = Read-Host "4. Enter phone IP address"
    $port = Read-Host "5. Enter port (usually 5555)"
    
    if ($ip -and $port) {
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect "$ip`:$port"
        Start-Sleep -Seconds 3
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
    }
}
