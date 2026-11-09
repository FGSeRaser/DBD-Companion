Imports System.Diagnostics
Imports System.Drawing
Imports System.IO
Imports System.Runtime.InteropServices
Imports System.Text.Json
Imports System.Windows.Forms
Imports Microsoft.Web.WebView2.Core
Imports Microsoft.Web.WebView2.WinForms

' DBD Companion – Hauptfenster: Oberfläche (WebView2), Tray-Symbol, globale Hotkeys,
' Ingame-Overlay (eigene durchsichtige Fenster) und OBS-Browserquelle.
' von FGSeRaser – https://github.com/FGSeRaser
Public Class Hauptfenster
    Inherits Form

    <DllImport("user32.dll")> Private Shared Function SetWindowDisplayAffinity(hWnd As IntPtr, dwAffinity As UInteger) As Boolean
    End Function

    Private web As WebView2
    Private tray As NotifyIcon
    Private miOverlay As ToolStripMenuItem, miEdit As ToolStripMenuItem
    Private hotkeys As Hotkeys
    Private bilder As BildCache
    Private obs As ObsServer
    Private ReadOnly widgets As New Dictionary(Of String, OverlayWidget)
    Private ReadOnly obenTimer As New Timer() With {.Interval = 1500}
    Private overlayAn As Boolean = False
    Private overlayEdit As Boolean = False
    Private bildschirm As Integer = 0
    Private letzteWidgets As JsonElement
    Private overlayVerstecken As Boolean = False
    Private beendenErlaubt As Boolean = False
    Private trayHinweisGezeigt As Boolean = False
    Private ReadOnly datenOrdner As String = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DBDCompanion")

    Public Sub New()
        Text = "DBD Companion – von FGSeRaser"
        ClientSize = New Size(1280, 860)
        MinimumSize = New Size(820, 560)
        StartPosition = FormStartPosition.CenterScreen
        BackColor = Color.FromArgb(13, 11, 16)
        Try
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath)
        Catch
        End Try
    End Sub

    Protected Overrides Async Sub OnLoad(e As EventArgs)
        MyBase.OnLoad(e)
        Directory.CreateDirectory(datenOrdner)
        bilder = New BildCache(datenOrdner)
        hotkeys = New Hotkeys(Handle)
        AddHandler hotkeys.Ausgeloest, Sub(id) BeginInvoke(Sub() AnSeite(New With {.type = "hotkey", .id = id}))
        AddHandler hotkeys.Problem, Sub(t) BeginInvoke(Sub() AnSeite(New With {.type = "hinweis", .text = t}))
        AddHandler obenTimer.Tick, Sub()
                                       For Each w In widgets.Values
                                           w.ObenHalten()
                                       Next
                                   End Sub
        obenTimer.Start()
        BaueTray()

        web = New WebView2() With {.Dock = DockStyle.Fill, .DefaultBackgroundColor = Color.FromArgb(13, 11, 16)}
        Controls.Add(web)
        Try
            ' Gleicher Datenordner und gleiche Adresse wie Version 1 → Challenges bleiben erhalten
            Dim env = Await CoreWebView2Environment.CreateAsync(Nothing, datenOrdner)
            Await web.EnsureCoreWebView2Async(env)
            Dim webOrdner As String = Path.Combine(AppContext.BaseDirectory, "web")
            web.CoreWebView2.SetVirtualHostNameToFolderMapping("dbd.local", webOrdner, CoreWebView2HostResourceAccessKind.Allow)
            web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = True
            web.CoreWebView2.Settings.IsZoomControlEnabled = True
            AddHandler web.CoreWebView2.WebMessageReceived, AddressOf VonSeite
            AddHandler web.CoreWebView2.NewWindowRequested, Sub(s, a)
                                                                a.Handled = True
                                                                Oeffnen(a.Uri)
                                                            End Sub
            web.CoreWebView2.Navigate("https://dbd.local/index.html")
        Catch ex As Exception
            MessageBox.Show("Die Oberfläche konnte nicht starten. Ist die »Microsoft Edge WebView2 Runtime« installiert?" &
                            vbCrLf & "Download: https://developer.microsoft.com/microsoft-edge/webview2/" & vbCrLf & vbCrLf & ex.Message,
                            "DBD Companion", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    ' ================================================================ Tray
    Private Sub BaueTray()
        tray = New NotifyIcon() With {.Icon = Icon, .Visible = True, .Text = "DBD Companion"}
        Dim cm As New ContextMenuStrip()
        cm.Items.Add("Fenster öffnen", Nothing, Sub() Zeigen())
        miOverlay = New ToolStripMenuItem("Ingame-Overlay") With {.CheckOnClick = True}
        AddHandler miOverlay.Click, Sub() AnSeite(New With {.type = "hotkey", .id = "ow:toggle"})
        miEdit = New ToolStripMenuItem("Overlay im Spiel verschieben") With {.CheckOnClick = True}
        AddHandler miEdit.Click, Sub() AnSeite(New With {.type = "hotkey", .id = "ow:edit"})
        cm.Items.Add(miOverlay)
        cm.Items.Add(miEdit)
        cm.Items.Add(New ToolStripSeparator())
        cm.Items.Add("GitHub: FGSeRaser", Nothing, Sub() Oeffnen("https://github.com/FGSeRaser"))
        cm.Items.Add("Beenden", Nothing, Sub()
                                             beendenErlaubt = True
                                             Close()
                                         End Sub)
        tray.ContextMenuStrip = cm
        AddHandler tray.DoubleClick, Sub() Zeigen()
    End Sub

    Private Sub Zeigen()
        Show()
        If WindowState = FormWindowState.Minimized Then WindowState = FormWindowState.Normal
        Activate()
    End Sub

    Private Shared Sub Oeffnen(url As String)
        Try
            Process.Start(New ProcessStartInfo(url) With {.UseShellExecute = True})
        Catch
        End Try
    End Sub

    Protected Overrides Sub OnFormClosing(e As FormClosingEventArgs)
        ' Läuft das Overlay, bleibt der Companion im Tray (unten rechts) aktiv
        If Not beendenErlaubt AndAlso overlayAn AndAlso e.CloseReason = CloseReason.UserClosing Then
            e.Cancel = True
            Hide()
            If Not trayHinweisGezeigt Then
                tray.ShowBalloonTip(4000, "DBD Companion läuft weiter", "Das Overlay bleibt aktiv. Rechtsklick auf das Symbol unten rechts → Beenden.", ToolTipIcon.Info)
                trayHinweisGezeigt = True
            End If
            Return
        End If
        hotkeys?.Dispose()
        obs?.Dispose()
        For Each w In widgets.Values
            w.Close()
        Next
        If tray IsNot Nothing Then tray.Visible = False
        MyBase.OnFormClosing(e)
    End Sub

    Protected Overrides Sub WndProc(ByRef m As Message)
        If hotkeys IsNot Nothing AndAlso hotkeys.Verarbeiten(m) Then Return
        MyBase.WndProc(m)
    End Sub

    ' ================================================================ Brücke zur Oberfläche
    Private Sub AnSeite(obj As Object)
        Try
            web?.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(obj))
        Catch
        End Try
    End Sub

    Private Sub VonSeite(sender As Object, e As CoreWebView2WebMessageReceivedEventArgs)
        Dim s As String
        Try
            s = e.TryGetWebMessageAsString()
        Catch
            Return
        End Try
        If String.IsNullOrEmpty(s) Then Return
        Try
            Using doc = JsonDocument.Parse(s)
                Dim r = doc.RootElement
                Select Case r.GetProperty("type").GetString()
                    Case "bereit"
                        Dim namen As New List(Of String)
                        For i As Integer = 0 To Screen.AllScreens.Length - 1
                            Dim sc = Screen.AllScreens(i)
                            namen.Add($"Bildschirm {i + 1} – {sc.Bounds.Width}×{sc.Bounds.Height}{If(sc.Primary, " (Haupt)", "")}")
                        Next
                        AnSeite(New With {.type = "hostInfo", .bildschirme = namen, .obsUrl = If(obs IsNot Nothing, $"http://localhost:{obs.Port}/", "")})
                        bildschirm = Zahl(r, "bildschirm", 0)
                        If Bool(r, "overlayAn") Then OverlaySchalten(True)
                    Case "hotkeys"
                        Dim liste As New List(Of KeyValuePair(Of String, String))
                        For Each h In r.GetProperty("liste").EnumerateArray()
                            liste.Add(New KeyValuePair(Of String, String)(h.GetProperty("id").GetString(), h.GetProperty("combo").GetString()))
                        Next
                        hotkeys.Setzen(liste, Text2(r, "modus"))
                    Case "hotkeyPause"
                        hotkeys.Pause(Bool(r, "an"))
                    Case "overlayAn"
                        bildschirm = Zahl(r, "bildschirm", bildschirm)
                        OverlaySchalten(Bool(r, "an"))
                    Case "overlayEdit"
                        overlayEdit = Bool(r, "an")
                        miEdit.Checked = overlayEdit
                        For Each w In widgets.Values
                            w.Bearbeiten(overlayEdit)
                        Next
                    Case "overlay"
                        letzteWidgets = r.GetProperty("widgets").Clone()
                        If obs IsNot Nothing Then obs.Zustand = letzteWidgets.GetRawText()
                        WidgetsAktualisieren()
                    Case "streamer"
                        StreamerSetzen(Bool(r, "obs"), Zahl(r, "port", 8833), Bool(r, "overlayVerstecken"), Bool(r, "fensterVerstecken"))
                    Case "screenshot"
                        Bildschirmfoto(Text2(r, "name"), Text2(r, "element"))
                End Select
            End Using
        Catch
        End Try
    End Sub

    Private Shared Function Bool(r As JsonElement, n As String) As Boolean
        Dim v As JsonElement
        Return r.TryGetProperty(n, v) AndAlso v.ValueKind = JsonValueKind.True
    End Function
    Private Shared Function Zahl(r As JsonElement, n As String, std As Integer) As Integer
        Dim v As JsonElement
        If r.TryGetProperty(n, v) AndAlso v.ValueKind = JsonValueKind.Number Then Return v.GetInt32()
        Return std
    End Function
    Private Shared Function Text2(r As JsonElement, n As String) As String
        Dim v As JsonElement
        If r.TryGetProperty(n, v) AndAlso v.ValueKind = JsonValueKind.String Then Return v.GetString()
        Return ""
    End Function

    ' ================================================================ Overlay
    Private Function ZielBildschirm() As Rectangle
        Dim alle = Screen.AllScreens
        Return alle(Math.Max(0, Math.Min(bildschirm, alle.Length - 1))).Bounds
    End Function

    Private Sub OverlaySchalten(an As Boolean)
        overlayAn = an
        miOverlay.Checked = an
        If Not an Then
            overlayEdit = False
            miEdit.Checked = False
            For Each w In widgets.Values
                w.Close()
                w.Dispose()
            Next
            widgets.Clear()
        Else
            WidgetsAktualisieren()
        End If
        AnSeite(New With {.type = "owStatus", .an = an})
    End Sub

    Private Sub WidgetsAktualisieren()
        If Not overlayAn OrElse letzteWidgets.ValueKind <> JsonValueKind.Array Then Return
        Dim gesehen As New HashSet(Of String)
        Dim b = ZielBildschirm()
        For Each wd In letzteWidgets.EnumerateArray()
            Dim id As String = wd.GetProperty("id").GetString()
            gesehen.Add(id)
            Dim w As OverlayWidget = Nothing
            If Not widgets.TryGetValue(id, w) Then
                w = New OverlayWidget(id, bilder)
                AddHandler w.Verschoben, Sub(wid, x, y) AnSeite(New With {.type = "owMoved", .id = wid, .x = x, .y = y})
                widgets(id) = w
                w.Bildschirm = b
                w.Show()
                w.VorAufnahmeVerstecken(overlayVerstecken)
                w.Bearbeiten(overlayEdit)
            End If
            w.Bildschirm = b
            w.Setzen(wd)
        Next
        For Each id In widgets.Keys.Where(Function(k) Not gesehen.Contains(k)).ToList()
            widgets(id).Close()
            widgets(id).Dispose()
            widgets.Remove(id)
        Next
    End Sub

    ' ================================================================ Streamer-Modus
    Private Sub StreamerSetzen(obsAn As Boolean, port As Integer, owVerstecken As Boolean, fensterVerstecken As Boolean)
        overlayVerstecken = owVerstecken
        For Each w In widgets.Values
            w.VorAufnahmeVerstecken(owVerstecken)
        Next
        Try
            SetWindowDisplayAffinity(Handle, If(fensterVerstecken, &H11UI, 0UI))
        Catch
        End Try
        If obsAn AndAlso (obs Is Nothing OrElse obs.Port <> port) Then
            obs?.Dispose()
            obs = New ObsServer(Path.Combine(AppContext.BaseDirectory, "web"), port)
            Dim fehler = obs.Starten()
            If fehler IsNot Nothing Then
                AnSeite(New With {.type = "hinweis", .text = $"OBS-Quelle konnte nicht starten (Port {port}): {fehler}"})
                obs = Nothing
            ElseIf letzteWidgets.ValueKind = JsonValueKind.Array Then
                obs.Zustand = letzteWidgets.GetRawText()
            End If
        ElseIf Not obsAn AndAlso obs IsNot Nothing Then
            obs.Dispose()
            obs = Nothing
        End If
        AnSeite(New With {.type = "hostInfo", .bildschirme = Screen.AllScreens.Select(Function(sc, i) $"Bildschirm {i + 1} – {sc.Bounds.Width}×{sc.Bounds.Height}{If(sc.Primary, " (Haupt)", "")}").ToList(),
                .obsUrl = If(obs IsNot Nothing, $"http://localhost:{obs.Port}/", "")})
    End Sub

    ' ================================================================ Bild speichern (z. B. Tier-Liste)
    Private Async Sub Bildschirmfoto(name As String, selektor As String)
        Try
            Dim js As String = "(()=>{const e=document.querySelector(" & JsonSerializer.Serialize(If(selektor, "body")) & ")||document.body;const r=e.getBoundingClientRect();" &
                               "return JSON.stringify({x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height});})()"
            Dim roh As String = Await web.CoreWebView2.ExecuteScriptAsync(js)
            Dim rechteck As String = JsonSerializer.Deserialize(Of String)(roh)
            Dim r = JsonDocument.Parse(rechteck).RootElement
            Dim parameter = JsonSerializer.Serialize(New With {
                .format = "png", .captureBeyondViewport = True,
                .clip = New With {.x = r.GetProperty("x").GetDouble(), .y = r.GetProperty("y").GetDouble(), .width = r.GetProperty("w").GetDouble(), .height = r.GetProperty("h").GetDouble(), .scale = 1}})
            Dim ergebnis As String = Await web.CoreWebView2.CallDevToolsProtocolMethodAsync("Page.captureScreenshot", parameter)
            Dim daten = Convert.FromBase64String(JsonDocument.Parse(ergebnis).RootElement.GetProperty("data").GetString())
            Dim ordner As String = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyPictures), "DBD Companion")
            Directory.CreateDirectory(ordner)
            Dim sauber As String = String.Join("_", If(name, "Bild").Split(Path.GetInvalidFileNameChars()))
            Dim datei As String = Path.Combine(ordner, $"{sauber} {DateTime.Now:yyyy-MM-dd HH-mm-ss}.png")
            File.WriteAllBytes(datei, daten)
            AnSeite(New With {.type = "hinweis", .text = "📷 Gespeichert in Bilder\DBD Companion"})
            Process.Start(New ProcessStartInfo("explorer.exe", $"/select,""{datei}""") With {.UseShellExecute = True})
        Catch ex As Exception
            AnSeite(New With {.type = "hinweis", .text = "Bild konnte nicht gespeichert werden: " & ex.Message})
        End Try
    End Sub
End Class
