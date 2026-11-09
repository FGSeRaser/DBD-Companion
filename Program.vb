' DBD Companion – Start. von FGSeRaser – https://github.com/FGSeRaser
Imports System.Windows.Forms

Module Program
    <STAThread()>
    Sub Main()
        ' Nur einmal starten
        Dim neu As Boolean
        Using m As New Threading.Mutex(True, "DBDCompanion_FGSeRaser", neu)
            If Not neu Then
                MessageBox.Show("Der DBD Companion läuft schon – schau unten rechts im Tray.", "DBD Companion")
                Return
            End If
            Application.SetHighDpiMode(HighDpiMode.PerMonitorV2)
            Application.EnableVisualStyles()
            Application.SetCompatibleTextRenderingDefault(False)
            Application.Run(New Hauptfenster())
        End Using
    End Sub
End Module
