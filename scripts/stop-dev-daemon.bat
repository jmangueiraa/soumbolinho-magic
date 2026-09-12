@echo off
chcp 65001 >nul
title Soumbolinho - Parar Servidor de Desenvolvimento

cd /d "%~dp0\.."

echo ========================================================
echo   🛑 Encerrando Servidor de Desenvolvimento
echo ========================================================
echo.

:: 1. Se estiver rodando via PM2, encerra no PM2
where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    call pm2 stop soumbolinho-dev >nul 2>nul
    call pm2 delete soumbolinho-dev >nul 2>nul
)

:: 2. Localiza e finaliza processos ouvindo na porta 5173
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    set FOUND=1
    echo [INFO] Finalizando processo na porta 5173 (PID %%a)...
    taskkill /F /PID %%a >nul 2>nul
)

if "%FOUND%"=="1" (
    echo.
    echo ✅ Servidor de desenvolvimento encerrado com sucesso!
) else (
    echo [INFO] Nenhum processo ativo encontrado na porta 5173.
)

timeout /t 2 >nul
exit /b 0
