$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Test-Path -LiteralPath '.env')) {
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        $password = -join ($bytes | ForEach-Object { $_.ToString('x2') })
        $rng.GetBytes($bytes)
        $key = [Convert]::ToBase64String($bytes)
        $rng.GetBytes($bytes)
        $webhookSecret = [Convert]::ToBase64String($bytes)
    } finally { $rng.Dispose() }
    $config = (Get-Content '.env.example' -Raw).Replace('change-me-use-a-long-random-password', $password).Replace('change-me-32-byte-base64-key', $key).Replace('change-me-webhook-secret', $webhookSecret)
    [IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $config)
}
docker compose config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Configuracao Docker invalida.' }
docker compose up -d --build --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar. Verifique o Docker Desktop e execute: docker compose logs --tail 100' }
$response = Invoke-RestMethod 'http://localhost:3000/api/health'
if ($response.status -ne 'ok') { throw 'O proxy da API nao respondeu corretamente.' }
Write-Host 'Aplicacao disponivel em http://localhost:3000'
