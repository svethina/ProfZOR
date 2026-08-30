using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Program
{
    const string AppName = "ProfZOR";
    const string Version = "1.0.1-trial";
    const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\ProfZOR";

    [STAThread]
    static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        bool uninstall = false;
        bool fromTemp = false;
        bool reinstall = false;
        for (int i = 0; i < args.Length; i++)
        {
            string a = args[i];
            if (string.Equals(a, "/uninstall", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(a, "-uninstall", StringComparison.OrdinalIgnoreCase))
            {
                uninstall = true;
            }
            if (string.Equals(a, "/from-temp", StringComparison.OrdinalIgnoreCase))
            {
                fromTemp = true;
            }
            if (string.Equals(a, "/reinstall", StringComparison.OrdinalIgnoreCase))
            {
                reinstall = true;
            }
        }

        string installDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            AppName);

        try
        {
            if (uninstall)
            {
                if (RunningFrom(installDir) && !fromTemp)
                {
                    return RelaunchFromTemp("/uninstall /from-temp");
                }
                if (MessageBox.Show(
                    "Удалить ProfZOR с этого компьютера?\n\nДанные интервью в браузере останутся.",
                    AppName,
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question) != DialogResult.Yes)
                {
                    return 0;
                }
                RemoveInstall(installDir);
                MessageBox.Show("ProfZOR удалён.", AppName);
                if (fromTemp)
                {
                    TryDeleteSelfLater();
                }
                return 0;
            }

            if (!reinstall && Directory.Exists(installDir) && File.Exists(Path.Combine(installDir, "index.html")))
            {
                DialogResult choice = ShowInstalledMenu(installDir);
                if (choice == DialogResult.Yes)
                {
                    OpenFile(Path.Combine(installDir, "index.html"));
                    return 0;
                }
                if (choice == DialogResult.Ignore)
                {
                    OpenFile(Path.Combine(installDir, "demo.html"));
                    return 0;
                }
                if (choice == DialogResult.Abort)
                {
                    if (RunningFrom(installDir))
                    {
                        return RelaunchFromTemp("/uninstall /from-temp");
                    }
                    if (MessageBox.Show(
                        "Удалить ProfZOR с этого компьютера?\n\nДанные интервью в браузере останутся.",
                        AppName,
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Question) != DialogResult.Yes)
                    {
                        return 0;
                    }
                    RemoveInstall(installDir);
                    MessageBox.Show("ProfZOR удалён.", AppName);
                    return 0;
                }
                if (choice != DialogResult.Retry)
                {
                    return 0;
                }
                if (RunningFrom(installDir))
                {
                    return RelaunchFromTemp("/reinstall");
                }
            }
            else if (!reinstall)
            {
                if (MessageBox.Show(
                    "Установить пробную копию ProfZOR для этого пользователя?\n\n" +
                    "Папка: " + installDir + "\n\n" +
                    "Права администратора не нужны. Ключ OpenRouter не входит в установку.",
                    AppName + " " + Version,
                    MessageBoxButtons.OKCancel,
                    MessageBoxIcon.Information) != DialogResult.OK)
                {
                    return 0;
                }
            }

            ExtractPayload(installDir);
            WriteUninstallHelper(installDir);
            CreateShortcuts(installDir);
            WriteUninstallRegistry(installDir);

            if (reinstall)
            {
                TryDeleteSelfLater();
            }

            DialogResult launch = MessageBox.Show(
                "Готово. Открыть рабочую версию?\n\nФорма будет пустой, прошлое интервью не подставится.\n\nНет — открыть демоверсию (Р-DEMO).",
                AppName,
                MessageBoxButtons.YesNoCancel,
                MessageBoxIcon.Information);
            if (launch == DialogResult.Yes)
            {
                OpenFile(Path.Combine(installDir, "index.html"));
            }
            else if (launch == DialogResult.No)
            {
                OpenFile(Path.Combine(installDir, "demo.html"));
            }
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Не удалось установить: " + ex.Message, AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    static DialogResult ShowInstalledMenu(string installDir)
    {
        using (Form f = new Form())
        {
            f.Text = AppName + " уже установлен";
            f.FormBorderStyle = FormBorderStyle.FixedDialog;
            f.StartPosition = FormStartPosition.CenterScreen;
            f.MinimizeBox = false;
            f.MaximizeBox = false;
            f.ShowInTaskbar = true;
            f.ClientSize = new Size(456, 228);
            f.Font = SystemFonts.MessageBoxFont;

            Label lbl = new Label();
            lbl.Text =
                "Папка: " + installDir + "\n\n" +
                "«Переустановить» обновит файлы. Рабочая версия всегда открывается с пустой формой. Демоверсия — это Р-DEMO, не ваше интервью.";
            lbl.SetBounds(16, 12, 424, 88);

            Button btnRe = new Button();
            btnRe.Text = "Переустановить";
            btnRe.SetBounds(16, 108, 208, 32);
            btnRe.DialogResult = DialogResult.Retry;

            Button btnWork = new Button();
            btnWork.Text = "Рабочая версия";
            btnWork.SetBounds(232, 108, 208, 32);
            btnWork.DialogResult = DialogResult.Yes;

            Button btnDemo = new Button();
            btnDemo.Text = "Демоверсия";
            btnDemo.SetBounds(16, 148, 136, 32);
            btnDemo.DialogResult = DialogResult.Ignore;

            Button btnDel = new Button();
            btnDel.Text = "Удалить";
            btnDel.SetBounds(160, 148, 136, 32);
            btnDel.DialogResult = DialogResult.Abort;

            Button btnCancel = new Button();
            btnCancel.Text = "Отмена";
            btnCancel.SetBounds(304, 148, 136, 32);
            btnCancel.DialogResult = DialogResult.Cancel;

            f.Controls.Add(lbl);
            f.Controls.Add(btnRe);
            f.Controls.Add(btnWork);
            f.Controls.Add(btnDemo);
            f.Controls.Add(btnDel);
            f.Controls.Add(btnCancel);
            f.AcceptButton = btnRe;
            f.CancelButton = btnCancel;
            return f.ShowDialog();
        }
    }

    static bool RunningFrom(string installDir)
    {
        try
        {
            string self = Path.GetFullPath(Assembly.GetExecutingAssembly().Location);
            string root = Path.GetFullPath(installDir).TrimEnd(Path.DirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
            return self.StartsWith(root, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    static int RelaunchFromTemp(string arguments)
    {
        string tempExe = Path.Combine(Path.GetTempPath(), "ProfZOR-Setup-run.exe");
        File.Copy(Assembly.GetExecutingAssembly().Location, tempExe, true);
        Process.Start(new ProcessStartInfo
        {
            FileName = tempExe,
            Arguments = arguments,
            UseShellExecute = false
        });
        return 0;
    }

    static void TryDeleteSelfLater()
    {
        try
        {
            string self = Assembly.GetExecutingAssembly().Location;
            string cmd = "/C ping 127.0.0.1 -n 2 >nul & del /f /q \"" + self + "\"";
            Process.Start(new ProcessStartInfo
            {
                FileName = "cmd.exe",
                Arguments = cmd,
                CreateNoWindow = true,
                UseShellExecute = false
            });
        }
        catch
        {
        }
    }

    static void ExtractPayload(string dest)
    {
        Directory.CreateDirectory(dest);
        Assembly asm = Assembly.GetExecutingAssembly();
        string resName = null;
        foreach (string name in asm.GetManifestResourceNames())
        {
            if (name.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase) ||
                name.Equals("payload.zip", StringComparison.OrdinalIgnoreCase))
            {
                resName = name;
                break;
            }
        }
        if (resName == null)
        {
            throw new InvalidOperationException("В установщике нет архива приложения.");
        }

        string destFull = Path.GetFullPath(dest).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string selfPath = "";
        try { selfPath = Path.GetFullPath(asm.Location); } catch { }

        using (Stream s = asm.GetManifestResourceStream(resName))
        {
            if (s == null) throw new InvalidOperationException("Не читается архив приложения.");
            using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
            {
                foreach (ZipArchiveEntry entry in zip.Entries)
                {
                    if (string.IsNullOrEmpty(entry.Name) && string.IsNullOrEmpty(entry.FullName)) continue;
                    string relative = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                    string outPath = Path.GetFullPath(Path.Combine(dest, relative));
                    if (!outPath.StartsWith(destFull, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("Некорректный путь в архиве.");
                    }
                    if (!string.IsNullOrEmpty(selfPath) &&
                        string.Equals(outPath, selfPath, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                    if (string.IsNullOrEmpty(entry.Name))
                    {
                        Directory.CreateDirectory(outPath);
                        continue;
                    }
                    Directory.CreateDirectory(Path.GetDirectoryName(outPath));
                    entry.ExtractToFile(outPath, true);
                }
            }
        }
    }

    static void CreateShortcuts(string installDir)
    {
        string programs = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
            "Programs",
            AppName);
        Directory.CreateDirectory(programs);
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

        WriteShortcut(Path.Combine(programs, "ProfZOR.lnk"), Path.Combine(installDir, "index.html"), installDir);
        WriteShortcut(Path.Combine(programs, "ProfZOR (демо).lnk"), Path.Combine(installDir, "demo.html"), installDir);
        WriteShortcut(Path.Combine(desktop, "ProfZOR.lnk"), Path.Combine(installDir, "index.html"), installDir);
        WriteShortcut(Path.Combine(desktop, "ProfZOR (демо).lnk"), Path.Combine(installDir, "demo.html"), installDir);
    }

    static void WriteShortcut(string lnkPath, string target, string workDir)
    {
        Type t = Type.GetTypeFromProgID("WScript.Shell");
        object shell = Activator.CreateInstance(t);
        object sc = t.InvokeMember(
            "CreateShortcut",
            BindingFlags.InvokeMethod,
            null,
            shell,
            new object[] { lnkPath });
        Type scType = sc.GetType();
        scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
        scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { workDir });
        scType.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { "ProfZOR" });
        scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
    }

    static void WriteUninstallHelper(string installDir)
    {
        string setupCopy = Path.Combine(installDir, "ProfZOR-Setup.exe");
        string self = Assembly.GetExecutingAssembly().Location;
        try
        {
            if (!string.Equals(Path.GetFullPath(self), Path.GetFullPath(setupCopy), StringComparison.OrdinalIgnoreCase))
            {
                File.Copy(self, setupCopy, true);
            }
        }
        catch
        {
        }
        File.WriteAllText(
            Path.Combine(installDir, "Удалить ProfZOR.bat"),
            "@echo off\r\n\"" + setupCopy + "\" /uninstall\r\n");
    }

    static void WriteUninstallRegistry(string installDir)
    {
        using (RegistryKey key = Registry.CurrentUser.CreateSubKey(UninstallKey))
        {
            if (key == null) return;
            string uninst = "\"" + Path.Combine(installDir, "ProfZOR-Setup.exe") + "\" /uninstall";
            key.SetValue("DisplayName", "ProfZOR (пробная версия)");
            key.SetValue("DisplayVersion", Version);
            key.SetValue("Publisher", "ProfZOR");
            key.SetValue("InstallLocation", installDir);
            key.SetValue("UninstallString", uninst);
            key.SetValue("QuietUninstallString", uninst);
            key.SetValue("NoModify", 1, RegistryValueKind.DWord);
            key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
    }

    static void RemoveInstall(string installDir)
    {
        string programs = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.StartMenu),
            "Programs",
            AppName);
        TryDelete(Path.Combine(programs, "ProfZOR (демо).lnk"));
        TryDelete(Path.Combine(programs, "ProfZOR.lnk"));
        TryDeleteDir(programs);
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
        TryDelete(Path.Combine(desktop, "ProfZOR (демо).lnk"));
        TryDelete(Path.Combine(desktop, "ProfZOR.lnk"));
        try { Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false); } catch { }
        TryDeleteDir(installDir);
        if (Directory.Exists(installDir))
        {
            throw new IOException(
                "Папка не удалилась (файл занят). Закройте ProfZOR и удалите вручную:\n" + installDir);
        }
    }

    static void TryDelete(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); } catch { }
    }

    static void TryDeleteDir(string path)
    {
        try { if (Directory.Exists(path)) Directory.Delete(path, true); } catch { }
    }

    static void OpenFile(string path)
    {
        Process.Start(new ProcessStartInfo
        {
            FileName = path,
            UseShellExecute = true
        });
    }
}
