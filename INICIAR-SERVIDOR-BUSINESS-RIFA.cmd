@echo off
title businessrifa - Servidor
cd /d "%~dp0"
echo businessrifa - servidor local
echo Endereco: http://127.0.0.1:4173
echo.
echo Mantenha esta janela aberta enquanto estiver usando o sistema.
echo Para encerrar, pressione Ctrl+C e confirme.
echo.
"C:\Program Files\nodejs\node.exe" server\server.mjs
echo.
echo O servidor foi encerrado.
pause
