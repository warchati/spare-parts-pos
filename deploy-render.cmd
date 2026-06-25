@echo off
REM ⚠️ Token eliminado por seguridad. Usa variable de entorno RENDER_TOKEN en su lugar.
setlocal
if "%RENDER_TOKEN%"=="" (
  echo ERROR: RENDER_TOKEN no está configurado.
  echo Configúralo con: set RENDER_TOKEN=tu_token_aqui
  exit /b 1
)
curl.exe -X POST https://api.render.com/v1/services ^
  -H "Authorization: Bearer %RENDER_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d @render-payload.json
endlocal
