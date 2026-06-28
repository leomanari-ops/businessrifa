@echo off
title businessrifa
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias do businessrifa...
  call npm.cmd install
)
echo Atualizando arquivos do businessrifa...
call npm.cmd run build
echo.
echo Iniciando o servidor do businessrifa...
echo.
echo businessrifa: http://127.0.0.1:4173
echo Uma janela do servidor sera aberta. Mantenha ela aberta enquanto usar o sistema.
echo Se aparecer nome antigo no navegador, pressione Ctrl+F5 uma vez.
echo.
start "businessrifa - Servidor" /D "%~dp0" cmd /k INICIAR-SERVIDOR-BUSINESS-RIFA.cmd
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:4173/?businessrifa=1'; for ($i=0; $i -lt 30; $i++) { try { Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/health' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process $url; exit } catch { Start-Sleep -Seconds 1 } }; Start-Process $url"
