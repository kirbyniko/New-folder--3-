$result = Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/local-meetings?lat=42.8525346&lng=-71.5079363&radius=50" -TimeoutSec 20
Write-Host "Result count: $($result.Count)"
$result | ForEach-Object { Write-Host "$($_.name) - $($_.date)" }
