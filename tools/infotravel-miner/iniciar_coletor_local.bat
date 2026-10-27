@echo off
chcp 65001 >nul
title Servidor Coletor Local Waesy (Porta 3333)
cd /d "%~dp0"
echo =======================================================
echo   Iniciando Servidor Coletor Local (Porta 3333)
echo   Salva automaticamente em CSV e JSON no seu computador
echo =======================================================
node coletor.mjs
pause
