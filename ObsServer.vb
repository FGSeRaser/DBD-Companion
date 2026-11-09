Imports System.IO
Imports System.Net
Imports System.Text

' DBD Companion – kleiner Webserver nur für diesen PC (localhost) für die OBS-Browserquelle.
' http://localhost:8833/  → durchsichtige Seite mit den Overlay-Widgets
' http://localhost:8833/state → aktuelle Widgets als JSON
' von FGSeRaser – https://github.com/FGSeRaser
Public Class ObsServer
    Implements IDisposable

    Private listener As HttpListener
    Private ReadOnly webOrdner As String
    Public Property Zustand As String = "[]"
    Public ReadOnly Property Port As Integer
    Public ReadOnly Property Laeuft As Boolean
        Get
            Return listener IsNot Nothing AndAlso listener.IsListening
        End Get
    End Property

    Public Sub New(ordner As String, p As Integer)
        webOrdner = ordner
        Port = p
    End Sub

    Public Function Starten() As String
        Try
            listener = New HttpListener()
            listener.Prefixes.Add($"http://localhost:{Port}/")
            listener.Start()
            Task.Run(AddressOf Schleife)
            Return Nothing
        Catch ex As Exception
            listener = Nothing
            Return ex.Message
        End Try
    End Function

    Private Async Function Schleife() As Task
        While Laeuft
            Dim ctx As HttpListenerContext
            Try
                ctx = Await listener.GetContextAsync()
            Catch
                Exit While
            End Try
            Try
                Antworten(ctx)
            Catch
                Try : ctx.Response.Abort() : Catch : End Try
            End Try
        End While
    End Function

    Private Shared ReadOnly TYPEN As New Dictionary(Of String, String) From {
        {".html", "text/html; charset=utf-8"}, {".js", "text/javascript; charset=utf-8"}, {".css", "text/css; charset=utf-8"},
        {".json", "application/json; charset=utf-8"}, {".png", "image/png"}, {".svg", "image/svg+xml"}}

    Private Sub Antworten(ctx As HttpListenerContext)
        Dim pfad As String = ctx.Request.Url.AbsolutePath
        Dim antwort = ctx.Response
        antwort.Headers.Add("Cache-Control", "no-store")
        Dim inhalt As Byte()
        If pfad = "/state" Then
            inhalt = Encoding.UTF8.GetBytes(Zustand)
            antwort.ContentType = TYPEN(".json")
        Else
            If pfad = "/" Then pfad = "/obs.html"
            Dim datei As String = Path.GetFullPath(Path.Combine(webOrdner, pfad.TrimStart("/"c).Replace("/"c, Path.DirectorySeparatorChar)))
            If Not datei.StartsWith(Path.GetFullPath(webOrdner), StringComparison.OrdinalIgnoreCase) OrElse Not File.Exists(datei) Then
                antwort.StatusCode = 404
                antwort.Close()
                Return
            End If
            inhalt = File.ReadAllBytes(datei)
            Dim typ As String = Nothing
            antwort.ContentType = If(TYPEN.TryGetValue(Path.GetExtension(datei).ToLowerInvariant(), typ), typ, "application/octet-stream")
        End If
        antwort.ContentLength64 = inhalt.Length
        antwort.OutputStream.Write(inhalt, 0, inhalt.Length)
        antwort.Close()
    End Sub

    Public Sub Dispose() Implements IDisposable.Dispose
        Try
            listener?.Stop()
            listener?.Close()
        Catch
        End Try
        listener = Nothing
    End Sub
End Class
