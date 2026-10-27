@echo off
chcp 65001 >nul
title Extrator de Clientes Infotravel - Extracao Completa (2000+ Reservas)
cd /d "%~dp0"
echo =======================================================
echo   Iniciando Extracao COMPLETA com Pacing Seguro (1 a 6s)
echo =======================================================
node miner.mjs --all
echo.
echo Abrindo pasta com os arquivos CSV e JSON...
explorer.exe "%~dp0output"
pause
