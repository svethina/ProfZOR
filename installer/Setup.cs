using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;

internal static class Program
{
    const string AppName = "ProfZOR";
    const string Version = "1.0-trial";
    const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\ProfZOR";

    [STAThread]
    static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        bool uninstall = false;
        for (int i = 0; i < args.Length; i++)
        {
            string a = args[i];
            if (string.Equals(a, "/uninstall", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(a, "-uninstall", StringComparison.OrdinalIgnoreCase))
            {
                uninstall = true;
            }
        }

        string installDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            AppName);

        try
        {
            if (uninstall)
            {
                if (MessageBox.Show(
                    "Удалить ProfZOR с этого компьютера? Данные в браузере останутся.",
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

            if (Directory.Exists(installDir) && File.Exists(Path.Combine(installDir, "index.html")))
            {
                DialogResult choice = MessageBox.Show(
                    "ProfZOR уже установлен.\n\nДа — открыть демо\nНет — переустановить\nОтмена — удалить",
                    AppName,
                    MessageBoxButtons.YesNoCancel,
                    MessageBoxIcon.Question);
                if (choice == DialogResult.Yes)
                {
                    OpenFile(Path.Combine(installDir, "demo.html"));
                    return 0;
                }
                if (choice == DialogResult.Cancel)
                {
                    RemoveInstall(installDir);
                    MessageBox.Show("ProfZOR удалён.", AppName);
                    return 0;
                }
            }
            else
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

            DialogResult launch = MessageBox.Show(
                "Готово. Открыть демоверсию сейчас?",
                AppName,
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Information);
            if (launch == DialogResult.Yes)
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

        WriteShortcut(Path.Combine(programs, "ProfZOR (демо).lnk"), Path.Combine(installDir, "demo.html"), installDir);
        WriteShortcut(Path.Combine(programs, "ProfZOR.lnk"), Path.Combine(installDir, "index.html"), installDir);
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
        File.Copy(self, setupCopy, true);
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
        TryDelete(Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),
            "ProfZOR (демо).lnk"));
        try { Registry.CurrentUser.DeleteSubKeyTree(UninstallKey, false); } catch { }
        TryDeleteDir(installDir);
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
