# Script para iniciar o Sistema de Relatórios
Write-Host "🚀 Iniciando Sistema de Relatórios..." -ForegroundColor Green

# Verificar se estamos na pasta correta
if (!(Test-Path "server") -or !(Test-Path "client")) {
    Write-Host "❌ Erro: Execute este script na pasta raiz do projeto" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Verificando dependências..." -ForegroundColor Yellow

# Verificar e instalar dependências se necessário
if (!(Test-Path "server/node_modules")) {
    Write-Host "🔧 Instalando dependências do servidor..." -ForegroundColor Yellow
    Set-Location server
    npm install
    Set-Location ..
}

if (!(Test-Path "client/node_modules")) {
    Write-Host "🔧 Instalando dependências do cliente..." -ForegroundColor Yellow
    Set-Location client
    npm install
    Set-Location ..
}

Write-Host "🌐 Iniciando servidor e cliente..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔗 Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔐 Credenciais:" -ForegroundColor Yellow
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Senha: password" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Para parar o sistema, pressione Ctrl+C" -ForegroundColor Red
Write-Host ""

# Iniciar usando concurrently se disponível, senão usar jobs do PowerShell
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run dev
} else {
    Write-Host "❌ NPM não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
} 