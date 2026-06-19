@echo off
setlocal
curl.exe -X POST https://api.render.com/v1/services ^
  -H "Authorization: Bearer rnd_6Wdy415repRSzJqG32DclV1WqWHz" ^
  -H "Content-Type: application/json" ^
  -d @C:\Users\admin\spare-parts-pos\render-payload.json
endlocal
