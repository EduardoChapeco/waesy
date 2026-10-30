# ==============================================================================
# WAESY CLOUD VPS - SCRIPT DE CONEXAO E PROVISIONAMENTO
# Alvo: waesy-cloud-vps (165.176.204.120)
# ==============================================================================

param(
    [string]$VpsIp = "165.176.204.120",
    [string]$KeyPath = "$HOME\.ssh\waesy-cloud-vps.key",
    [string]$User = "opc"
)

Write-Host "Verificando conectividade com VPS Waesy Cloud ($($VpsIp):22)..." -ForegroundColor Cyan

# Teste com Socket rapido (timeout 3 segundos) em vez de Test-NetConnection longo
$socket = New-Object System.Net.Sockets.TcpClient
$asyncResult = $socket.BeginConnect($VpsIp, 22, $null, $null)
$success = $asyncResult.AsyncWaitHandle.WaitOne(3000, $false)

if (-not $success -or -not $socket.Connected) {
    if ($socket.Connected) { $socket.Close() }
    Write-Host "BLOQUEIO DETECTADO: A porta 22 em $($VpsIp) nao respondeu (Timeout 3s)." -ForegroundColor Yellow
    Write-Host "Motivo: Falta liberar a regra de entrada (Ingress Rule) na Security List da Oracle Cloud." -ForegroundColor Yellow
    return $false
}
$socket.Close()

Write-Host "Porta 22 aberta e acessivel com sucesso!" -ForegroundColor Green

# 1. Copiar script de provisionamento
Write-Host "Enviando script de provisionamento para $($VpsIp)..." -ForegroundColor Cyan
scp -i "$KeyPath" -o StrictHostKeyChecking=accept-new scripts/provision-waesy-cloud-vps.sh "$($User)@$($VpsIp):~/provision.sh"

# 2. Executar script remoto
Write-Host "Executando provisionamento na VPS..." -ForegroundColor Cyan
ssh -i "$KeyPath" -o StrictHostKeyChecking=accept-new "$($User)@$($VpsIp)" "chmod +x ~/provision.sh && ~/provision.sh"

Write-Host "Provisionamento concluido com sucesso no Waesy Cloud!" -ForegroundColor Green
return $true
