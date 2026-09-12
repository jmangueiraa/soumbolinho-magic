Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
BatchPath = ScriptDir & "\start-dev-daemon.bat"

WshShell.Run "cmd.exe /c """ & BatchPath & """ --silent", 0, False
Set WshShell = Nothing
Set FSO = Nothing
