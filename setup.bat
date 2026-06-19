@echo off
echo === AutoRepuestos POS - Setup ===
echo.

echo 1. Instalando PostgreSQL via Docker...
docker-compose up -d 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Docker no disponible. Asegurate de tener PostgreSQL corriendo en localhost:5432
  echo Config: postgres/postgres / database: spare_parts_pos
)

echo 2. Instalando dependencias del backend...
cd backend
call npm.cmd install
call npm.cmd run prisma:generate
echo.

echo 3. Configurando base de datos...
call npm.cmd run prisma:migrate -- --name init
call npm.cmd run prisma:seed
cd ..
echo.

echo 4. Instalando dependencias del frontend web...
cd web
call npm.cmd install
cd ..
echo.

echo 5. Instalando dependencias mobile...
cd mobile
call npm.cmd install
cd ..
echo.

echo === Setup completado! ===
echo.
echo Para iniciar:
echo   backend:  cd backend ^&^& npm run dev
echo   web:      cd web ^&^& npm run dev
echo   mobile:   cd mobile ^&^& npm start
echo.
echo Credenciales: admin / admin123
echo.
pause
