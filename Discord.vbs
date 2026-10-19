Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Inicia o servidor Node em segundo plano sem janela
WshShell.Run "node server.js", 0, False
WScript.Sleep 1000

' Abre a janela dedicada do Discord (modo aplicativo desktop sem abas de navegador)
WshShell.Run "msedge.exe --app=http://localhost:3000 --app-window-size=1280,800", 1, False
