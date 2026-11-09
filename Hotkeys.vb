Imports System.Runtime.InteropServices
Imports System.Windows.Forms

' DBD Companion – globale Hotkeys, die auch mitten im Spiel funktionieren.
' Zwei Arten:
'  • Abfangen:    RegisterHotKey – die Taste geht nur an den Companion (sicher, Standard)
'  • Durchlassen: Tastatur-Hook – die Taste wirkt im Spiel UND im Companion
' Tasten kommen aus der Oberfläche als "Ctrl+Alt+KeyF" (KeyboardEvent.code).
' von FGSeRaser – https://github.com/FGSeRaser
Public Class Hotkeys
    Implements IDisposable

    <DllImport("user32.dll")> Private Shared Function RegisterHotKey(hWnd As IntPtr, id As Integer, fsModifiers As Integer, vk As Integer) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function UnregisterHotKey(hWnd As IntPtr, id As Integer) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function MapVirtualKey(uCode As UInteger, uMapType As UInteger) As UInteger
    End Function
    <DllImport("user32.dll")> Private Shared Function GetAsyncKeyState(vKey As Integer) As Short
    End Function
    <DllImport("user32.dll", SetLastError:=True)> Private Shared Function SetWindowsHookEx(idHook As Integer, lpfn As HookProc, hMod As IntPtr, dwThreadId As UInteger) As IntPtr
    End Function
    <DllImport("user32.dll")> Private Shared Function UnhookWindowsHookEx(hhk As IntPtr) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function CallNextHookEx(hhk As IntPtr, nCode As Integer, wParam As IntPtr, lParam As IntPtr) As IntPtr
    End Function
    <DllImport("kernel32.dll", CharSet:=CharSet.Unicode)> Private Shared Function GetModuleHandle(lpModuleName As String) As IntPtr
    End Function

    Private Delegate Function HookProc(nCode As Integer, wParam As IntPtr, lParam As IntPtr) As IntPtr

    Public Const WM_HOTKEY As Integer = &H312
    Private Const MOD_ALT As Integer = &H1, MOD_CONTROL As Integer = &H2, MOD_SHIFT As Integer = &H4, MOD_WIN As Integer = &H8, MOD_NOREPEAT As Integer = &H4000
    Private Const WH_KEYBOARD_LL As Integer = 13
    Private Const WM_KEYDOWN As Integer = &H100, WM_KEYUP As Integer = &H101, WM_SYSKEYDOWN As Integer = &H104, WM_SYSKEYUP As Integer = &H105

    Private Class Eintrag
        Public Id As String
        Public Mods As Integer
        Public Vk As Integer
    End Class

    Private ReadOnly fenster As IntPtr
    Private eintraege As New List(Of Eintrag)
    Private registriert As New List(Of Integer)
    Private modus As String = "abfangen"
    Private pausiert As Boolean = False
    Private hook As IntPtr = IntPtr.Zero
    Private hookProcRef As HookProc
    Private gedrueckt As New HashSet(Of Integer)

    ''' <summary>Wird ausgelöst, wenn ein Hotkey gedrückt wurde (Id aus der Oberfläche).</summary>
    Public Event Ausgeloest(id As String)
    ''' <summary>Meldet Tasten, die nicht belegt werden konnten.</summary>
    Public Event Problem(text As String)

    Public Sub New(fensterHandle As IntPtr)
        fenster = fensterHandle
    End Sub

    Public Sub Setzen(liste As List(Of KeyValuePair(Of String, String)), neuerModus As String)
        modus = If(neuerModus = "durchlassen", "durchlassen", "abfangen")
        eintraege.Clear()
        For Each kv In liste
            Dim e = Parsen(kv.Value)
            If e IsNot Nothing Then
                e.Id = kv.Key
                eintraege.Add(e)
            End If
        Next
        Anwenden()
    End Sub

    Public Sub Pause(an As Boolean)
        pausiert = an
        Anwenden()
    End Sub

    Private Sub Anwenden()
        Abmelden()
        If pausiert OrElse eintraege.Count = 0 Then Return
        If modus = "abfangen" Then
            Dim fehler As New List(Of String)
            For i As Integer = 0 To eintraege.Count - 1
                If RegisterHotKey(fenster, 9000 + i, eintraege(i).Mods Or MOD_NOREPEAT, eintraege(i).Vk) Then
                    registriert.Add(9000 + i)
                Else
                    fehler.Add(eintraege(i).Id)
                End If
            Next
            If fehler.Count > 0 Then RaiseEvent Problem($"{fehler.Count} Hotkey(s) sind schon von einem anderen Programm belegt. Wähle eine andere Taste oder stell auf „Durchlassen“.")
        Else
            hookProcRef = AddressOf HookCallback
            hook = SetWindowsHookEx(WH_KEYBOARD_LL, hookProcRef, GetModuleHandle(Nothing), 0)
            If hook = IntPtr.Zero Then RaiseEvent Problem("Der Tastatur-Hook konnte nicht gestartet werden – bitte „Abfangen“ benutzen.")
        End If
    End Sub

    Private Sub Abmelden()
        For Each id In registriert
            UnregisterHotKey(fenster, id)
        Next
        registriert.Clear()
        If hook <> IntPtr.Zero Then
            UnhookWindowsHookEx(hook)
            hook = IntPtr.Zero
        End If
        gedrueckt.Clear()
    End Sub

    ''' <summary>Aus WndProc des Hauptfensters aufrufen.</summary>
    Public Function Verarbeiten(ByRef m As Message) As Boolean
        If m.Msg <> WM_HOTKEY Then Return False
        Dim i As Integer = m.WParam.ToInt32() - 9000
        If i >= 0 AndAlso i < eintraege.Count Then RaiseEvent Ausgeloest(eintraege(i).Id)
        Return True
    End Function

    Private Function HookCallback(nCode As Integer, wParam As IntPtr, lParam As IntPtr) As IntPtr
        If nCode >= 0 Then
            Dim msg As Integer = wParam.ToInt32()
            Dim vk As Integer = Marshal.ReadInt32(lParam)
            If msg = WM_KEYDOWN OrElse msg = WM_SYSKEYDOWN Then
                If Not gedrueckt.Contains(vk) Then
                    gedrueckt.Add(vk)
                    Dim mods As Integer = AktuelleMods()
                    For Each e In eintraege
                        If e.Vk = vk AndAlso e.Mods = mods Then
                            Dim id As String = e.Id
                            Threading.ThreadPool.QueueUserWorkItem(Sub() RaiseEvent Ausgeloest(id))
                        End If
                    Next
                End If
            ElseIf msg = WM_KEYUP OrElse msg = WM_SYSKEYUP Then
                gedrueckt.Remove(vk)
            End If
        End If
        ' Taste immer ans Spiel weitergeben
        Return CallNextHookEx(hook, nCode, wParam, lParam)
    End Function

    Private Shared Function Unten(vk As Integer) As Boolean
        Return (GetAsyncKeyState(vk) And &H8000) <> 0
    End Function

    Private Shared Function AktuelleMods() As Integer
        Dim m As Integer = 0
        If Unten(&H11) Then m = m Or MOD_CONTROL
        If Unten(&H12) Then m = m Or MOD_ALT
        If Unten(&H10) Then m = m Or MOD_SHIFT
        If Unten(&H5B) OrElse Unten(&H5C) Then m = m Or MOD_WIN
        Return m
    End Function

    ' ------------------------------------------------------------------ Tasten übersetzen
    ' Buchstaben/Zahlen/Satzzeichen über den Scancode → passt auch bei deutscher Tastatur (Y/Z, Ü, Ö …)
    Private Shared ReadOnly SCAN As New Dictionary(Of String, UInteger) From {
        {"Escape", &H1}, {"Digit1", &H2}, {"Digit2", &H3}, {"Digit3", &H4}, {"Digit4", &H5}, {"Digit5", &H6}, {"Digit6", &H7}, {"Digit7", &H8},
        {"Digit8", &H9}, {"Digit9", &HA}, {"Digit0", &HB}, {"Minus", &HC}, {"Equal", &HD}, {"Backspace", &HE}, {"Tab", &HF},
        {"KeyQ", &H10}, {"KeyW", &H11}, {"KeyE", &H12}, {"KeyR", &H13}, {"KeyT", &H14}, {"KeyY", &H15}, {"KeyU", &H16}, {"KeyI", &H17},
        {"KeyO", &H18}, {"KeyP", &H19}, {"BracketLeft", &H1A}, {"BracketRight", &H1B}, {"KeyA", &H1E}, {"KeyS", &H1F}, {"KeyD", &H20},
        {"KeyF", &H21}, {"KeyG", &H22}, {"KeyH", &H23}, {"KeyJ", &H24}, {"KeyK", &H25}, {"KeyL", &H26}, {"Semicolon", &H27}, {"Quote", &H28},
        {"Backquote", &H29}, {"Backslash", &H2B}, {"KeyZ", &H2C}, {"KeyX", &H2D}, {"KeyC", &H2E}, {"KeyV", &H2F}, {"KeyB", &H30},
        {"KeyN", &H31}, {"KeyM", &H32}, {"Comma", &H33}, {"Period", &H34}, {"Slash", &H35}, {"IntlBackslash", &H56}}

    Private Shared ReadOnly FEST As New Dictionary(Of String, Integer) From {
        {"Space", &H20}, {"Enter", &HD}, {"NumpadEnter", &HD}, {"ArrowUp", &H26}, {"ArrowDown", &H28}, {"ArrowLeft", &H25}, {"ArrowRight", &H27},
        {"Insert", &H2D}, {"Delete", &H2E}, {"Home", &H24}, {"End", &H23}, {"PageUp", &H21}, {"PageDown", &H22},
        {"NumpadAdd", &H6B}, {"NumpadSubtract", &H6D}, {"NumpadMultiply", &H6A}, {"NumpadDivide", &H6F}, {"NumpadDecimal", &H6E},
        {"Pause", &H13}, {"ScrollLock", &H91}, {"PrintScreen", &H2C}, {"CapsLock", &H14}, {"ContextMenu", &H5D}}

    Private Shared Function Parsen(combo As String) As Eintrag
        If String.IsNullOrWhiteSpace(combo) Then Return Nothing
        Dim teile = combo.Split("+"c)
        Dim e As New Eintrag()
        For Each t In teile.Take(teile.Length - 1)
            Select Case t
                Case "Ctrl" : e.Mods = e.Mods Or MOD_CONTROL
                Case "Alt" : e.Mods = e.Mods Or MOD_ALT
                Case "Shift" : e.Mods = e.Mods Or MOD_SHIFT
                Case "Win" : e.Mods = e.Mods Or MOD_WIN
            End Select
        Next
        Dim code As String = teile(teile.Length - 1)
        If FEST.ContainsKey(code) Then
            e.Vk = FEST(code)
        ElseIf code.StartsWith("Numpad") AndAlso code.Length = 7 AndAlso Char.IsDigit(code(6)) Then
            e.Vk = &H60 + (AscW(code(6)) - 48)
        ElseIf code.Length >= 2 AndAlso code(0) = "F"c AndAlso IstZahl(code.Substring(1)) Then
            Dim n As Integer = CInt(code.Substring(1))
            If n >= 1 AndAlso n <= 24 Then e.Vk = &H6F + n
        ElseIf SCAN.ContainsKey(code) Then
            e.Vk = CInt(MapVirtualKey(SCAN(code), 1))
        End If
        Return If(e.Vk > 0, e, Nothing)
    End Function

    Private Shared Function IstZahl(s As String) As Boolean
        If s.Length = 0 OrElse s.Length > 2 Then Return False
        For Each c As Char In s
            If Not Char.IsDigit(c) Then Return False
        Next
        Return True
    End Function

    Public Sub Dispose() Implements IDisposable.Dispose
        Abmelden()
    End Sub
End Class
