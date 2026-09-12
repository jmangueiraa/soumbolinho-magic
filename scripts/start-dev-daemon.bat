@echo off
chcp 65001 >nul
title Soumbolinho - Servidor de Desenvolvimento em Segundo Plano

cd /d "%~dp0\.."

echo ========================================================
echo   🍰 Soumbolinho - Servidor de Desenvolvimento
echo ========================================================
echo.

:: 1. Verifica se a porta 5173 já está em uso
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo [INFO] O servidor de desenvolvimento ja esta ativo na porta 5173 (PID %%a).
    echo [INFO] Acesse: http://localhost:5173
    if not "%1"=="--silent" pause
    exit /b 0
)

:: 2. Verifica se o PM2 está instalado globalmente
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] PM2 detectado. Iniciando daemon via PM2...
    call pm2 start ecosystem.config.cjs
    echo.
    echo ✅ Servidor iniciado com sucesso via PM2!
    echo    URL: http://localhost:5173
    echo    Para ver status: npm run dev:status
    echo    Para ver logs:   npm run dev:logs
    echo    Para parar:      npm run dev:stop
    if not "%1"=="--silent" timeout /t 4 >nul
    exit /b 0
)

:: 3. Se PM2 não estiver disponível, inicia via PowerShell em segundo plano
echo [INFO] Iniciando servidor Vite em segundo plano no Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process node -ArgumentList '.\node_modules\vite\bin\vite.js', '--host' -WorkingDirectory (Get-Location) -WindowStyle Minimized"

:: Espera 2 segundos para checagem da porta
timeout /t 2 /nobreak >nul

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo.
    echo ✅ Servidor Vite rodando com sucesso em segundo plano!
    echo    URL Local: http://localhost:5173
    echo    PID: %%a
    echo.
    echo Para encerrar o servidor, execute scripts\stop-dev-daemon.bat
    if not "%1"=="--silent" timeout /t 3 >nul
    exit /b 0
)

echo [AVISO] Servidor iniciado. Verifique http://localhost:5173 no seu navegador.
if not "%1"=="--silent" timeout /t 3 >nul
exit /b 0
