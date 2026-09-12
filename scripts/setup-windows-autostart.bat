@echo off
chcp 65001 >nul
title Soumbolinho - Configurador de Autostart no Windows

cd /d "%~dp0\.."

echo ========================================================
echo   ⚙️ Configurador de Autostart no Windows
echo ========================================================
echo.
echo Escolha uma opção:
echo [1] Ativar inicialização automática com o Windows (em segundo plano)
echo [2] Desativar inicialização automática
echo [3] Sair
echo.

set /p OPT="Digite a opção desejada (1, 2 ou 3): "

if "%OPT%"=="1" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup\Soumbolinho-Dev.lnk')); $s.TargetPath = [System.IO.Path]::Combine((Get-Location).Path, 'scripts\start-background.vbs'); $s.WorkingDirectory = (Get-Location).Path; $s.Description = 'Soumbolinho Vite Dev Server Autostart'; $s.Save()"
    echo.
    echo ✅ Autostart ativado com sucesso!
    echo Sempre que você ligar ou reiniciar o computador, o servidor de desenvolvimento
    echo iniciará silenciosamente em segundo plano em http://localhost:5173.
    pause
    exit /b 0
)

if "%OPT%"=="2" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$lnk = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup\Soumbolinho-Dev.lnk'); if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Host 'Atalho removido com sucesso.' } else { Write-Host 'O autostart já não estava ativo.' }"
    echo.
    echo 🛑 Autostart desativado.
    pause
    exit /b 0
)

exit /b 0
