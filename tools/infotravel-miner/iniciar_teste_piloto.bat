@echo off
chcp 65001 >nul
title Extrator de Clientes Infotravel - Teste Piloto (10 Reservas)
cd /d "%~dp0"
echo =======================================================
echo   Iniciando Extrator de Clientes - Modo Piloto (10 itens)
echo =======================================================
node miner.mjs --limit=10
echo.
echo Abrindo pasta com os arquivos CSV e JSON gerados...
explorer.exe "%~dp0output"
pause
