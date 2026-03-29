@echo off
echo.
echo =======================================================
echo   Sincronizando Mayson con Internet (GitHub -^> Render)
echo =======================================================
echo.

echo 1. Preparando los archivos...
"C:\Program Files\Git\cmd\git.exe" init
"C:\Program Files\Git\cmd\git.exe" config --global user.email "maysondeploybot@example.com"
"C:\Program Files\Git\cmd\git.exe" config --global user.name "Mayson Deploy Bot"
"C:\Program Files\Git\cmd\git.exe" add .

echo.
echo 2. Guardando los cambios...
"C:\Program Files\Git\cmd\git.exe" commit -m "Actualizacion automatica de Mayson"

echo.
echo 3. Comprobando canal de subida...
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/albertllacuna-create/ai-app-builder.git 2>nul
"C:\Program Files\Git\cmd\git.exe" branch -M master

echo.
echo 4. Enviando a la nube (esto puede tardar unos segundos)...
"C:\Program Files\Git\cmd\git.exe" push -u origin master

echo.
echo =======================================================
if %errorlevel% neq 0 (
    echo X Ups, parece que algo ha fallado. Revisa si GitHub te pide contrasena.
) else (
    echo V Exito! Mayson se ha subido correctamente.
    echo Render lo detectara y actualizara tu web en 1 o 2 minutos.
)
echo =======================================================
echo.
pause
