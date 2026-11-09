Imports System.Drawing
Imports System.Drawing.Drawing2D
Imports System.Drawing.Imaging
Imports System.Drawing.Text
Imports System.Runtime.InteropServices
Imports System.Text.Json
Imports System.Windows.Forms

' DBD Companion – ein Ingame-Overlay-Teil (Timer, Challenge, Build …) als eigenes, durchsichtiges Fenster.
' Echte Pixel-Transparenz (UpdateLayeredWindow), immer oben, klickt durch, nimmt dem Spiel nie den Fokus.
' Im Bearbeiten-Modus lässt es sich mit der Maus verschieben.
' von FGSeRaser – https://github.com/FGSeRaser
Public Class OverlayWidget
    Inherits Form

    ' ------------------------------------------------------------------ Win32
    <StructLayout(LayoutKind.Sequential)> Private Structure POINTW
        Public X As Integer, Y As Integer
        Public Sub New(x As Integer, y As Integer)
            Me.X = x : Me.Y = y
        End Sub
    End Structure
    <StructLayout(LayoutKind.Sequential)> Private Structure SIZEW
        Public W As Integer, H As Integer
        Public Sub New(w As Integer, h As Integer)
            Me.W = w : Me.H = h
        End Sub
    End Structure
    <StructLayout(LayoutKind.Sequential, Pack:=1)> Private Structure BLENDFUNCTION
        Public BlendOp As Byte, BlendFlags As Byte, SourceConstantAlpha As Byte, AlphaFormat As Byte
    End Structure
    <DllImport("user32.dll", SetLastError:=True)> Private Shared Function UpdateLayeredWindow(hwnd As IntPtr, hdcDst As IntPtr, ByRef pptDst As POINTW, ByRef psize As SIZEW, hdcSrc As IntPtr, ByRef pprSrc As POINTW, crKey As Integer, ByRef pblend As BLENDFUNCTION, dwFlags As Integer) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function GetDC(hWnd As IntPtr) As IntPtr
    End Function
    <DllImport("user32.dll")> Private Shared Function ReleaseDC(hWnd As IntPtr, hDC As IntPtr) As Integer
    End Function
    <DllImport("gdi32.dll")> Private Shared Function CreateCompatibleDC(hDC As IntPtr) As IntPtr
    End Function
    <DllImport("gdi32.dll")> Private Shared Function DeleteDC(hdc As IntPtr) As Boolean
    End Function
    <DllImport("gdi32.dll")> Private Shared Function SelectObject(hDC As IntPtr, hObject As IntPtr) As IntPtr
    End Function
    <DllImport("gdi32.dll")> Private Shared Function DeleteObject(hObject As IntPtr) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function SetWindowPos(hWnd As IntPtr, hWndInsertAfter As IntPtr, X As Integer, Y As Integer, cx As Integer, cy As Integer, uFlags As UInteger) As Boolean
    End Function
    <DllImport("user32.dll")> Private Shared Function GetWindowLong(hWnd As IntPtr, nIndex As Integer) As Integer
    End Function
    <DllImport("user32.dll")> Private Shared Function SetWindowLong(hWnd As IntPtr, nIndex As Integer, dwNewLong As Integer) As Integer
    End Function
    <DllImport("user32.dll")> Private Shared Function SetWindowDisplayAffinity(hWnd As IntPtr, dwAffinity As UInteger) As Boolean
    End Function

    Private Const WS_EX_LAYERED As Integer = &H80000
    Private Const WS_EX_TRANSPARENT As Integer = &H20
    Private Const WS_EX_TOOLWINDOW As Integer = &H80
    Private Const WS_EX_TOPMOST As Integer = &H8
    Private Const WS_EX_NOACTIVATE As Integer = &H8000000
    Private Const GWL_EXSTYLE As Integer = -20
    Private Const ULW_ALPHA As Integer = 2
    Private Shared ReadOnly HWND_TOPMOST As New IntPtr(-1)
    Private Const SWP_NOSIZE As UInteger = &H1, SWP_NOMOVE As UInteger = &H2, SWP_NOACTIVATE As UInteger = &H10, SWP_SHOWWINDOW As UInteger = &H40

    ' ------------------------------------------------------------------ Daten
    Public ReadOnly WidgetId As String
    Private daten As JsonElement
    Private imEdit As Boolean = False
    Private ziehStart As Point, fensterStart As Point, zieht As Boolean
    Private ReadOnly bilder As BildCache
    Public Property Bildschirm As Rectangle

    ''' <summary>Nach dem Verschieben: neue Position als Anteil des Bildschirms (0..1).</summary>
    Public Event Verschoben(id As String, x As Double, y As Double)

    Public Sub New(id As String, cache As BildCache)
        WidgetId = id
        bilder = cache
        FormBorderStyle = FormBorderStyle.None
        ShowInTaskbar = False
        StartPosition = FormStartPosition.Manual
        TopMost = True
        Text = "DBD Companion Overlay"
    End Sub

    Protected Overrides ReadOnly Property ShowWithoutActivation As Boolean
        Get
            Return True
        End Get
    End Property

    Protected Overrides ReadOnly Property CreateParams As CreateParams
        Get
            Dim cp = MyBase.CreateParams
            cp.ExStyle = cp.ExStyle Or WS_EX_LAYERED Or WS_EX_TOOLWINDOW Or WS_EX_TOPMOST Or WS_EX_NOACTIVATE Or WS_EX_TRANSPARENT
            Return cp
        End Get
    End Property

    Public Sub VorAufnahmeVerstecken(an As Boolean)
        Try
            SetWindowDisplayAffinity(Handle, If(an, &H11UI, 0UI))   ' WDA_EXCLUDEFROMCAPTURE
        Catch
        End Try
    End Sub

    Public Sub Bearbeiten(an As Boolean)
        imEdit = an
        Dim ex As Integer = GetWindowLong(Handle, GWL_EXSTYLE)
        ex = If(an, ex And Not WS_EX_TRANSPARENT, ex Or WS_EX_TRANSPARENT)
        SetWindowLong(Handle, GWL_EXSTYLE, ex)
        Cursor = If(an, Cursors.SizeAll, Cursors.Default)
        Zeichnen()
    End Sub

    Public Sub ObenHalten()
        If Visible Then SetWindowPos(Handle, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE Or SWP_NOSIZE Or SWP_NOACTIVATE)
    End Sub

    Public Sub Setzen(w As JsonElement)
        daten = w.Clone()
        Zeichnen()
    End Sub

    ' ------------------------------------------------------------------ Verschieben
    Protected Overrides Sub OnMouseDown(e As MouseEventArgs)
        If imEdit AndAlso e.Button = MouseButtons.Left Then
            zieht = True
            ziehStart = Control.MousePosition
            fensterStart = Location
        End If
    End Sub
    Protected Overrides Sub OnMouseMove(e As MouseEventArgs)
        If zieht Then
            Dim p = Control.MousePosition
            Location = New Point(fensterStart.X + p.X - ziehStart.X, fensterStart.Y + p.Y - ziehStart.Y)
        End If
    End Sub
    Protected Overrides Sub OnMouseUp(e As MouseEventArgs)
        If zieht Then
            zieht = False
            Dim b = Bildschirm
            Dim x As Double = Math.Max(0, Math.Min(0.99, (Left - b.X) / CDbl(b.Width)))
            Dim y As Double = Math.Max(0, Math.Min(0.99, (Top - b.Y) / CDbl(b.Height)))
            RaiseEvent Verschoben(WidgetId, x, y)
        End If
    End Sub

    ' ------------------------------------------------------------------ Zeichnen
    Private Shared Function Farbe(hex As String, Optional alpha As Integer = 255) As Color
        Try
            If String.IsNullOrEmpty(hex) OrElse hex(0) <> "#"c Then Return Color.FromArgb(alpha, Color.White)
            Dim c = ColorTranslator.FromHtml(hex)
            Return Color.FromArgb(alpha, c)
        Catch
            Return Color.FromArgb(alpha, Color.White)
        End Try
    End Function
    Private Shared Function Str(e As JsonElement, name As String) As String
        Dim v As JsonElement
        If e.ValueKind = JsonValueKind.Object AndAlso e.TryGetProperty(name, v) AndAlso v.ValueKind = JsonValueKind.String Then Return v.GetString()
        Return Nothing
    End Function
    Private Shared Function Num(e As JsonElement, name As String, std As Double) As Double
        Dim v As JsonElement
        If e.ValueKind = JsonValueKind.Object AndAlso e.TryGetProperty(name, v) AndAlso v.ValueKind = JsonValueKind.Number Then Return v.GetDouble()
        Return std
    End Function
    Private Shared Function HatNum(e As JsonElement, name As String) As Boolean
        Dim v As JsonElement
        Return e.ValueKind = JsonValueKind.Object AndAlso e.TryGetProperty(name, v) AndAlso v.ValueKind = JsonValueKind.Number
    End Function
    Private Shared Function IstWahr(e As JsonElement, name As String) As Boolean
        Dim v As JsonElement
        Return e.ValueKind = JsonValueKind.Object AndAlso e.TryGetProperty(name, v) AndAlso v.ValueKind = JsonValueKind.True
    End Function
    Private Shared Function Liste(e As JsonElement, name As String) As List(Of JsonElement)
        Dim v As JsonElement
        Dim l As New List(Of JsonElement)
        If e.ValueKind = JsonValueKind.Object AndAlso e.TryGetProperty(name, v) AndAlso v.ValueKind = JsonValueKind.Array Then
            For Each x In v.EnumerateArray()
                l.Add(x)
            Next
        End If
        Return l
    End Function

    Private Shared Function RundesRechteck(r As RectangleF, radius As Single) As GraphicsPath
        Dim p As New GraphicsPath()
        Dim d As Single = radius * 2
        p.AddArc(r.X, r.Y, d, d, 180, 90)
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90)
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90)
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90)
        p.CloseFigure()
        Return p
    End Function

    Public Sub Zeichnen()
        If daten.ValueKind <> JsonValueKind.Object OrElse Not IsHandleCreated Then Return
        Dim dpi As Single = DeviceDpi / 96.0F
        Dim s As Single = CSng(Num(daten, "skala", 1)) * dpi
        Dim deckkraft As Double = Num(daten, "deckkraft", 0.55)
        Dim hg = Farbe(Str(daten, "hg"), CInt(Math.Max(If(imEdit, 90, 0), deckkraft * 255)))
        Dim akzent = Farbe(Str(daten, "akzent"))
        Dim textFarbe = Farbe(If(Str(daten, "text"), "#ffffff"))
        Dim titel As String = Str(daten, "titel")
        Dim zeilen = Liste(daten, "zeilen")
        Dim icons = Liste(daten, "icons")

        Using fTitel As New Font("Segoe UI", 9.5F * s, FontStyle.Bold, GraphicsUnit.Pixel),
              fText As New Font("Segoe UI", 14.0F * s, FontStyle.Bold, GraphicsUnit.Pixel),
              fGross As New Font("Segoe UI", 20.0F * s, FontStyle.Bold, GraphicsUnit.Pixel),
              fSub As New Font("Segoe UI", 11.5F * s, FontStyle.Regular, GraphicsUnit.Pixel),
              fWert As New Font("Consolas", 16.0F * s, FontStyle.Bold, GraphicsUnit.Pixel),
              messBmp As New Bitmap(1, 1), mg As Graphics = Graphics.FromImage(messBmp)
            ' ---- Größe ausmessen
            Dim pad As Single = 10 * s, iconGr As Single = 26 * s, perkGr As Single = 46 * s
            Dim breite As Single = 180 * s, hoehe As Single = pad
            If Not String.IsNullOrEmpty(titel) Then
                breite = Math.Max(breite, mg.MeasureString(titel.ToUpperInvariant(), fTitel).Width + pad * 2 + 6 * s)
                hoehe += fTitel.Height + 4 * s
            End If
            For Each z In zeilen
                Dim t As String = If(Str(z, "text"), "")
                Dim f = If(IstWahr(z, "gross"), fGross, fText)
                Dim tw As Single = Math.Min(mg.MeasureString(t, f).Width, 340 * s)
                Dim zb As Single = pad * 2 + 6 * s + tw
                If Str(z, "icon") IsNot Nothing Then zb += iconGr + 6 * s
                Dim wertM As String = Str(z, "wert")
                If wertM IsNot Nothing Then zb += mg.MeasureString(wertM, fWert).Width + 10 * s
                breite = Math.Max(breite, zb)
                Dim zh As Single = Math.Max(f.Height, If(Str(z, "icon") IsNot Nothing, iconGr, 0))
                If Str(z, "sub") IsNot Nothing Then zh += fSub.Height
                If HatNum(z, "fortschritt") Then zh += 6 * s
                hoehe += zh + 4 * s
            Next
            If icons.Count > 0 Then
                breite = Math.Max(breite, pad * 2 + 6 * s + icons.Count * (perkGr + 4 * s))
                hoehe += perkGr + 6 * s
            End If
            hoehe += pad - 4 * s
            breite = Math.Min(breite, 520 * s)
            Dim BB As Integer = CInt(Math.Ceiling(breite)) + 2, HH As Integer = CInt(Math.Ceiling(hoehe)) + 2

            Using bmp As New Bitmap(BB, HH, PixelFormat.Format32bppArgb), g As Graphics = Graphics.FromImage(bmp)
                g.SmoothingMode = SmoothingMode.AntiAlias
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit
                g.InterpolationMode = InterpolationMode.HighQualityBicubic
                g.Clear(Color.Transparent)
                Dim r As New RectangleF(0, 0, BB - 1, HH - 1)
                Using p = RundesRechteck(r, 10 * s), b As New SolidBrush(hg)
                    g.FillPath(b, p)
                    If imEdit Then
                        Using stift As New Pen(Color.FromArgb(230, 255, 207, 74), 2 * dpi) With {.DashStyle = DashStyle.Dash}
                            g.DrawPath(stift, p)
                        End Using
                    End If
                End Using
                Using b As New SolidBrush(akzent)
                    g.FillRectangle(b, 0, 6 * s, 4 * s, HH - 12 * s)
                End Using
                Dim x0 As Single = pad + 4 * s, y As Single = pad
                Dim schatten As New SolidBrush(Color.FromArgb(170, 0, 0, 0))
                If Not String.IsNullOrEmpty(titel) Then
                    Using b As New SolidBrush(akzent)
                        g.DrawString(titel.ToUpperInvariant(), fTitel, b, x0, y)
                    End Using
                    y += fTitel.Height + 4 * s
                End If
                For Each z In zeilen
                    Dim t As String = If(Str(z, "text"), "")
                    Dim f = If(IstWahr(z, "gross"), fGross, fText)
                    Dim farbeZ = If(Str(z, "farbe") IsNot Nothing, Farbe(Str(z, "farbe")), textFarbe)
                    Dim x As Single = x0
                    Dim zeilenH As Single = Math.Max(f.Height, If(Str(z, "icon") IsNot Nothing, iconGr, 0))
                    Dim icon As String = Str(z, "icon")
                    If icon IsNot Nothing Then
                        Dim bild = bilder.Holen(icon, AddressOf NachLaden)
                        If bild IsNot Nothing Then g.DrawImage(bild, x, y, iconGr, iconGr)
                        x += iconGr + 6 * s
                    End If
                    Dim wert As String = Str(z, "wert")
                    Dim wertBreite As Single = If(wert IsNot Nothing, g.MeasureString(wert, fWert).Width, 0)
                    Dim textRect As New RectangleF(x, y + (zeilenH - f.Height) / 2, BB - x - pad - wertBreite - 4 * s, f.Height + 2)
                    Using fmt As New StringFormat() With {.Trimming = StringTrimming.EllipsisCharacter, .FormatFlags = StringFormatFlags.NoWrap}
                        g.DrawString(t, f, schatten, New RectangleF(textRect.X + 1.2F * s, textRect.Y + 1.2F * s, textRect.Width, textRect.Height), fmt)
                        Using b As New SolidBrush(farbeZ)
                            g.DrawString(t, f, b, textRect, fmt)
                        End Using
                    End Using
                    If wert IsNot Nothing Then
                        Dim wy As Single = y + (zeilenH - fWert.Height) / 2
                        g.DrawString(wert, fWert, schatten, BB - pad - wertBreite + 1.2F * s, wy + 1.2F * s)
                        Using b As New SolidBrush(farbeZ)
                            g.DrawString(wert, fWert, b, BB - pad - wertBreite, wy)
                        End Using
                    End If
                    y += zeilenH
                    Dim subT As String = Str(z, "sub")
                    If subT IsNot Nothing Then
                        Using b As New SolidBrush(Color.FromArgb(200, textFarbe))
                            g.DrawString(subT, fSub, b, x, y)
                        End Using
                        y += fSub.Height
                    End If
                    If HatNum(z, "fortschritt") Then
                        Dim fp As Single = CSng(Math.Max(0, Math.Min(1, Num(z, "fortschritt", 0))))
                        Dim bw As Single = BB - x - pad
                        Using b As New SolidBrush(Color.FromArgb(60, 255, 255, 255))
                            g.FillRectangle(b, x, y + 1 * s, bw, 4 * s)
                        End Using
                        Using b As New SolidBrush(farbeZ)
                            g.FillRectangle(b, x, y + 1 * s, bw * fp, 4 * s)
                        End Using
                        y += 6 * s
                    End If
                    y += 4 * s
                Next
                If icons.Count > 0 Then
                    Dim x As Single = x0
                    For Each ic In icons
                        Dim url As String = If(ic.ValueKind = JsonValueKind.String, ic.GetString(), Nothing)
                        Dim bild = If(url IsNot Nothing, bilder.Holen(url, AddressOf NachLaden), Nothing)
                        If bild IsNot Nothing Then
                            g.DrawImage(bild, x, y, perkGr, perkGr)
                        Else
                            Using stift As New Pen(Color.FromArgb(90, 255, 255, 255), 1) With {.DashStyle = DashStyle.Dash}
                                g.DrawRectangle(stift, x, y, perkGr, perkGr)
                            End Using
                        End If
                        x += perkGr + 4 * s
                    Next
                End If
                schatten.Dispose()

                ' Position aus den Anteilen
                Dim b2 = Bildschirm
                Dim px As Integer = If(zieht, Left, b2.X + CInt(Num(daten, "x", 0) * b2.Width))
                Dim py As Integer = If(zieht, Top, b2.Y + CInt(Num(daten, "y", 0) * b2.Height))
                AufFensterBringen(bmp, px, py)
            End Using
        End Using
    End Sub

    Private Sub NachLaden()
        If IsHandleCreated AndAlso Not IsDisposed Then BeginInvoke(New Action(AddressOf Zeichnen))
    End Sub

    Private Sub AufFensterBringen(bmp As Bitmap, x As Integer, y As Integer)
        Dim screenDc As IntPtr = GetDC(IntPtr.Zero)
        Dim memDc As IntPtr = CreateCompatibleDC(screenDc)
        Dim hBmp As IntPtr = IntPtr.Zero, alt As IntPtr = IntPtr.Zero
        Try
            hBmp = bmp.GetHbitmap(Color.FromArgb(0))
            alt = SelectObject(memDc, hBmp)
            Dim groesse As New SIZEW(bmp.Width, bmp.Height)
            Dim quelle As New POINTW(0, 0)
            Dim ziel As New POINTW(x, y)
            Dim blend As New BLENDFUNCTION With {.BlendOp = 0, .BlendFlags = 0, .SourceConstantAlpha = 255, .AlphaFormat = 1}
            UpdateLayeredWindow(Handle, screenDc, ziel, groesse, memDc, quelle, 0, blend, ULW_ALPHA)
            SetBounds(x, y, bmp.Width, bmp.Height)
        Finally
            ReleaseDC(IntPtr.Zero, screenDc)
            If hBmp <> IntPtr.Zero Then
                SelectObject(memDc, alt)
                DeleteObject(hBmp)
            End If
            DeleteDC(memDc)
        End Try
    End Sub
End Class
