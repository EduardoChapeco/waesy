param(
    [string]$VpsIp = "165.176.204.120",
    [string]$KeyPath = "$HOME\.ssh\waesy-cloud-vps.key",
    [string]$User = "opc"
)

Write-Host "Monitorando porta 22 em $VpsIp a cada 3 segundos..." -ForegroundColor Cyan
Write-Host "Assim que a regra de entrada for adicionada na Oracle Cloud, o provisionamento iniciara automaticamente." -ForegroundColor Yellow

$attempts = 0
$maxAttempts = 1200

while ($attempts -lt $maxAttempts) {
    $attempts++
    $socket = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $socket.BeginConnect($VpsIp, 22, $null, $null)
    $success = $asyncResult.AsyncWaitHandle.WaitOne(2000, $false)

    if ($success -and $socket.Connected) {
        $socket.Close()
        Write-Host "`n>>> SUCESSO! Porta 22 detectada aberta na tentativa $attempts!" -ForegroundColor Green
        & "$PSScriptRoot\connect-waesy-cloud.ps1" -VpsIp $VpsIp -KeyPath $KeyPath -User $User
        return
    }
    if ($socket.Connected) { $socket.Close() }
    Write-Host "." -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

Write-Host "`nTempo limite de monitoramento concluido." -ForegroundColor Red
