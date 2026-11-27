@echo off
chcp 65001 >nul
where py >nul 2>nul
if errorlevel 1 goto python
py -3 "%~dp0assistant.py"
goto end
:python
python "%~dp0assistant.py"
:end
pause
