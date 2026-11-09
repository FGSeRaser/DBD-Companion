Imports System.Drawing
Imports System.IO
Imports System.Net.Http
Imports System.Security.Cryptography
Imports System.Text

' DBD Companion – lädt Perk-Icons und Porträts fürs Overlay und speichert sie auf der Festplatte (offline nutzbar).
' von FGSeRaser – https://github.com/FGSeRaser
Public Class BildCache
    Private ReadOnly ordner As String
    Private ReadOnly bilder As New Dictionary(Of String, Image)
    Private ReadOnly laedt As New HashSet(Of String)
    Private Shared ReadOnly http As New HttpClient() With {.Timeout = TimeSpan.FromSeconds(15)}

    Shared Sub New()
        http.DefaultRequestHeaders.UserAgent.ParseAdd("DBDCompanion/2.0 (+https://github.com/FGSeRaser)")
    End Sub

    Public Sub New(datenOrdner As String)
        ordner = Path.Combine(datenOrdner, "bilder")
        Directory.CreateDirectory(ordner)
    End Sub

    Private Shared Function DateiName(url As String) As String
        Using sha = SHA1.Create()
            Return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(url))).Substring(0, 24) & ".png"
        End Using
    End Function

    ''' <summary>Gibt das Bild zurück, wenn es schon da ist; sonst wird es geladen und fertig() aufgerufen.</summary>
    Public Function Holen(url As String, fertig As Action) As Image
        If String.IsNullOrEmpty(url) Then Return Nothing
        SyncLock bilder
            If bilder.ContainsKey(url) Then Return bilder(url)
            If laedt.Contains(url) Then Return Nothing
            laedt.Add(url)
        End SyncLock
        Dim datei As String = Path.Combine(ordner, DateiName(url))
        Task.Run(Async Function()
                     Dim bild As Image = Nothing
                     Try
                         If File.Exists(datei) Then
                             bild = Image.FromStream(New MemoryStream(File.ReadAllBytes(datei)))
                         ElseIf url.StartsWith("http", StringComparison.OrdinalIgnoreCase) Then
                             Dim bytes = Await http.GetByteArrayAsync(url)
                             bild = Image.FromStream(New MemoryStream(bytes))
                             File.WriteAllBytes(datei, bytes)
                         End If
                     Catch
                     End Try
                     SyncLock bilder
                         bilder(url) = bild
                         laedt.Remove(url)
                     End SyncLock
                     If bild IsNot Nothing Then fertig?.Invoke()
                 End Function)
        Return Nothing
    End Function
End Class
