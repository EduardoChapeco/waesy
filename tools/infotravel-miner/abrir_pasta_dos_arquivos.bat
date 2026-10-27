@echo off
chcp 65001 >nul
title Pasta dos Arquivos Extraídos - Waesy
cd /d "%~dp0"
echo =======================================================
echo   Abrindo a Pasta com os Arquivos CSV e JSON...
echo =======================================================
explorer.exe "%~dp0output"
exit
