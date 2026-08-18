@echo off
echo Installing StockMaster Desktop Icon...

set "APP_DIR=%~dp0"
set "HTML_PATH=%APP_DIR%index.html"
set "URI_PATH=%HTML_PATH:\=/%"

set "PS_SCRIPT=%TEMP%\create_shortcut.ps1"
echo $WshShell = New-Object -comObject WScript.Shell > "%PS_SCRIPT%"
echo $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\StockMaster.lnk") >> "%PS_SCRIPT%"
echo $Shortcut.TargetPath = "msedge.exe" >> "%PS_SCRIPT%"
echo $Shortcut.Arguments = "--app=""file:///%URI_PATH%""" >> "%PS_SCRIPT%"
echo $Shortcut.Save() >> "%PS_SCRIPT%"

powershell -ExecutionPolicy Bypass -NoProfile -File "%PS_SCRIPT%"
del "%PS_SCRIPT%"

echo.
echo Desktop icon created successfully on your Desktop!
echo You can now use the "StockMaster" icon to open the app.
pause
