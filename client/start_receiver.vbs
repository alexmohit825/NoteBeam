Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
strScript = strDir & "\notebeam_receiver.py"
objShell.Run "pythonw.exe """ & strScript & """", 0, False
