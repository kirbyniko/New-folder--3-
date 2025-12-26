Write-Host "=== ADB Connection Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

# Check ADB
Write-Host "[1/5] Checking ADB installation..." -ForegroundColor Yellow
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adbPath) {
    $version = & $adbPath version 2>&1 | Select-Object -First 1
    Write-Host "  OK: $version" -ForegroundColor Green
} else {
    Write-Host "  ERROR: ADB not found" -ForegroundColor Red
    exit
}

# Kill and restart ADB server
Write-Host ""
Write-Host "[2/5] Restarting ADB server..." -ForegroundColor Yellow
& $adbPath kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
& $adbPath start-server 2>&1 | Out-Null
Write-Host "  OK: ADB server restarted" -ForegroundColor Green

# Check for devices
Write-Host ""
Write-Host "[3/5] Checking for connected devices..." -ForegroundColor Yellow
$devices = & $adbPath devices
$deviceLines = $devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
if ($deviceLines) {
    Write-Host "  OK: Device(s) found!" -ForegroundColor Green
    $devices | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  WARNING: No devices detected" -ForegroundColor Red
}

# Check USB devices in Windows
Write-Host ""
Write-Host "[4/5] Checking Windows USB devices..." -ForegroundColor Yellow
$usbDevices = Get-PnpDevice -Class USB | Where-Object { $_.Status -eq "OK" }
$usbCount = ($usbDevices | Measure-Object).Count
Write-Host "  Found $usbCount USB devices connected" -ForegroundColor Cyan

$androidDevices = Get-PnpDevice | Where-Object { 
    $_.FriendlyName -like "*Android*" -or 
    $_.FriendlyName -like "*ADB*" -or
    $_.FriendlyName -like "*Google*" -and $_.Class -eq "USB"
}
if ($androidDevices) {
    Write-Host "  OK: Android device found in Windows!" -ForegroundColor Green
    $androidDevices | ForEach-Object { 
        Write-Host "    $($_.FriendlyName) - $($_.Status)" 
    }
} else {
    Write-Host "  WARNING: No Android device visible to Windows" -ForegroundColor Red
    Write-Host "  This usually means:" -ForegroundColor Yellow
    Write-Host "    - Cable is charge-only (no data)" -ForegroundColor Yellow
    Write-Host "    - Phone is in 'Charging only' mode" -ForegroundColor Yellow
    Write-Host "    - USB drivers not installed" -ForegroundColor Yellow
}

# Check for error devices
Write-Host ""
Write-Host "[5/5] Checking for device errors..." -ForegroundColor Yellow
$errorDevices = Get-PnpDevice | Where-Object { $_.Status -eq "Error" }
if ($errorDevices) {
    Write-Host "  WARNING: Found devices with errors:" -ForegroundColor Red
    $errorDevices | Select-Object -First 5 | ForEach-Object {
        Write-Host "    $($_.FriendlyName) - $($_.Class)" -ForegroundColor Red
    }
} else {
    Write-Host "  OK: No device errors" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
if (-not $deviceLines) {
    Write-Host "Your phone is NOT detected. Try these steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. On your phone:" -ForegroundColor White
    Write-Host "   - Settings -> Developer Options" -ForegroundColor Gray
    Write-Host "   - Turn OFF 'USB debugging'" -ForegroundColor Gray
    Write-Host "   - Tap 'Revoke USB debugging authorizations'" -ForegroundColor Gray
    Write-Host "   - Turn USB debugging back ON" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Unplug and replug USB cable" -ForegroundColor White
    Write-Host ""
    Write-Host "3. When you plug in, on your phone:" -ForegroundColor White
    Write-Host "   - Look for 'Allow USB debugging?' popup" -ForegroundColor Gray
    Write-Host "   - Check 'Always allow from this computer'" -ForegroundColor Gray
    Write-Host "   - Tap OK" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Check USB notification on phone:" -ForegroundColor White
    Write-Host "   - Swipe down notification shade" -ForegroundColor Gray
    Write-Host "   - Tap USB notification" -ForegroundColor Gray
    Write-Host "   - Select 'File Transfer' or 'MTP' (NOT Charging)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Try a different USB cable or USB port" -ForegroundColor White
    Write-Host ""
    Write-Host "After each step, run this script again to check." -ForegroundColor Cyan
} else {
    Write-Host "SUCCESS! Your device is connected." -ForegroundColor Green
    Write-Host "You can now install the APK with:" -ForegroundColor Cyan
    Write-Host "  .\install-apk.ps1" -ForegroundColor White
}
