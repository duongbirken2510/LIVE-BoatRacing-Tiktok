/**
 * Trình đóng gói Bộ cài đặt Windows (.EXE) cho LIVE-BOAT RACING TIKTOK (v2.0.0)
 * Phát triển bởi Duong Birken (https://duongbirken.deta.vn)
 *
 * Xuất bản:
 *  1) Release_Windows/LIVE-BoatRacing-Tiktok-v2.0.0-Setup.exe
 *     -> 1 File cài đặt .EXE duy nhất có giao diện đồ họa Tiếng Việt, tích hợp sẵn Node Runtime,
 *        Frontend dist/, Server đóng gói, 23 chặng sông, tạo biểu tượng Desktop & tự mở app.
 *  2) LIVE-BoatRacing-Tiktok.exe
 *     -> File chạy trực tiếp không hiện cửa sổ CMD đen.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_TMP = path.join(ROOT_DIR, 'dist_installer_tmp');
const STAGE_DIR = path.join(BUILD_TMP, 'LIVE-BoatRacing-Tiktok');
const RELEASE_DIR = path.join(ROOT_DIR, 'Release_Windows');
const SETUP_EXE_PATH = path.join(RELEASE_DIR, 'LIVE-BoatRacing-Tiktok-v2.0.0-Setup.exe');
const ROOT_LAUNCHER_EXE = path.join(ROOT_DIR, 'LIVE-BoatRacing-Tiktok.exe');

function findCscExe() {
  const candidates = [
    'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
    'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Không tìm thấy trình biên dịch C# (csc.exe) của Windows .NET Framework.');
}

/**
 * Tạo icon ứng dụng 256x256 PNG và đóng gói thành chuẩn Windows .ICO
 */
async function ensureAppIcon() {
  const iconPngPath = path.join(ROOT_DIR, 'public', 'assets', 'app-icon.png');
  const iconIcoPath = path.join(ROOT_DIR, 'public', 'assets', 'app-icon.ico');

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0d3b49"/>
        <stop offset="100%" stop-color="#04131a"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="50%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#d97706"/>
      </linearGradient>
    </defs>
    <rect x="8" y="8" width="240" height="240" rx="54" fill="url(#bg)" stroke="url(#gold)" stroke-width="8"/>
    <path d="M 28 196 Q 78 176 128 196 T 228 196" fill="none" stroke="#2dd4bf" stroke-width="10" stroke-linecap="round"/>
    <path d="M 46 218 Q 88 202 128 218 T 210 218" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round"/>
    <path d="M 38 152 C 62 188, 190 188, 216 144 L 230 110 C 212 122, 198 130, 184 134 L 66 134 C 54 128, 46 116, 40 100 Z" fill="url(#gold)"/>
    <path d="M 204 126 C 214 98, 232 78, 220 58 C 208 62, 198 72, 194 84 C 184 74, 174 72, 164 78 C 176 88, 184 100, 180 120 Z" fill="url(#gold)"/>
    <circle cx="211" cy="76" r="4.5" fill="#dc2626"/>
    <path d="M 92 52 L 92 130" stroke="#fef08a" stroke-width="6" stroke-linecap="round"/>
    <path d="M 94 55 L 164 70 L 94 92 Z" fill="#e11d48" stroke="#fef08a" stroke-width="2.5"/>
  </svg>`;

  const pngBuf = await sharp(Buffer.from(iconSvg)).resize(256, 256).png().toBuffer();
  fs.writeFileSync(iconPngPath, pngBuf);

  // Tạo header ICO chuẩn (1 ảnh 256x256 PNG)
  const icoHeader = Buffer.alloc(6 + 16);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type: 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // Count: 1 image
  icoHeader.writeUInt8(0, 6);    // Width: 0 means 256
  icoHeader.writeUInt8(0, 7);    // Height: 0 means 256
  icoHeader.writeUInt8(0, 8);    // ColorCount
  icoHeader.writeUInt8(0, 9);    // Reserved
  icoHeader.writeUInt16LE(1, 10); // Planes
  icoHeader.writeUInt16LE(32, 12); // BitCount
  icoHeader.writeUInt32LE(pngBuf.length, 14); // BytesInRes
  icoHeader.writeUInt32LE(22, 18); // ImageOffset

  fs.writeFileSync(iconIcoPath, Buffer.concat([icoHeader, pngBuf]));
  return iconIcoPath;
}

function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/**
 * Biên dịch Launcher: LIVE-BoatRacing-Tiktok.exe
 * Chạy ngầm server (không hiện cửa sổ CMD đen) và tự mở giao diện điều khiển
 */
function compileAppLauncherExe(cscPath, iconPath, outputExePath) {
  const csSource = `
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

class AppLauncher
{
    static bool IsPortListening(int port)
    {
        try
        {
            using (TcpClient client = new TcpClient())
            {
                var result = client.BeginConnect("127.0.0.1", port, null, null);
                bool success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(350));
                if (!success) return false;
                client.EndConnect(result);
                return true;
            }
        }
        catch
        {
            return false;
        }
    }

    static string ResolveNodeExe(string appDir)
    {
        string bundledNode = Path.Combine(appDir, "runtime", "node.exe");
        if (File.Exists(bundledNode)) return bundledNode;
        string progNode = @"C:\\Program Files\\nodejs\\node.exe";
        if (File.Exists(progNode)) return progNode;
        return "node";
    }

    static void OpenAppWindow(string url)
    {
        string[] browserPaths = new string[]
        {
            @"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
            @"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
            @"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            @"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        };

        foreach (string bp in browserPaths)
        {
            if (File.Exists(bp))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = bp,
                    Arguments = "--app=\\"" + url + "\\" --start-maximized",
                    UseShellExecute = true
                });
                return;
            }
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }

    [STAThread]
    static void Main()
    {
        string appDir = AppDomain.CurrentDomain.BaseDirectory;
        string serverCjs = Path.Combine(appDir, "server.cjs");
        string serverTs = Path.Combine(appDir, "server.ts");
        string tsxCli = Path.Combine(appDir, "node_modules", "tsx", "dist", "cli.mjs");

        string launchArgs = "";
        if (File.Exists(serverCjs))
        {
            launchArgs = "\\"server.cjs\\"";
        }
        else if (File.Exists(serverTs) && File.Exists(tsxCli))
        {
            launchArgs = "\\"" + tsxCli + "\\" \\"server.ts\\"";
        }
        else
        {
            MessageBox.Show("Không tìm thấy file máy chủ (server.cjs hoặc server.ts) tại: " + appDir, "LIVE-BOAT RACING TIKTOK", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        int port = 3010;
        if (!IsPortListening(port))
        {
            string nodeExe = ResolveNodeExe(appDir);
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = nodeExe,
                    Arguments = launchArgs,
                    WorkingDirectory = appDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                psi.EnvironmentVariables["NODE_ENV"] = File.Exists(serverCjs) ? "production" : "development";
                psi.EnvironmentVariables["LIVE_MODE"] = "1";
                psi.EnvironmentVariables["PORT"] = "3010";
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Không thể khởi động Node Runtime: " + ex.Message, "LIVE-BOAT RACING TIKTOK", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            for (int i = 0; i < 30; i++)
            {
                if (IsPortListening(port)) break;
                Thread.Sleep(250);
            }
        }

        OpenAppWindow("http://localhost:" + port);
    }
}
`;
  const tempCs = path.join(BUILD_TMP, '_TempLauncher.cs');
  fs.writeFileSync(tempCs, csSource, 'utf8');
  const cscArgs = [
    '/target:winexe',
    '/optimize+',
    `/out:${outputExePath}`,
    '/r:System.dll',
    '/r:System.Windows.Forms.dll',
  ];
  if (fs.existsSync(iconPath)) {
    cscArgs.push(`/win32icon:${iconPath}`);
  }
  cscArgs.push(tempCs);
  execFileSync(cscPath, cscArgs);
  fs.unlinkSync(tempCs);
}

/**
 * Biên dịch Setup Stub (WinForms Self-Extracting Installer)
 */
function compileSetupStubExe(cscPath, iconPath, outputStubPath) {
  const csSource = `
using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

public class SubStream : Stream
{
    private readonly Stream _baseStream;
    private readonly long _baseOffset;
    private readonly long _length;
    private long _position;

    public SubStream(Stream baseStream, long baseOffset, long length)
    {
        _baseStream = baseStream;
        _baseOffset = baseOffset;
        _length = length;
        _position = 0;
        _baseStream.Seek(_baseOffset, SeekOrigin.Begin);
    }

    public override bool CanRead { get { return true; } }
    public override bool CanSeek { get { return true; } }
    public override bool CanWrite { get { return false; } }
    public override long Length { get { return _length; } }

    public override long Position
    {
        get { return _position; }
        set { Seek(value, SeekOrigin.Begin); }
    }

    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        long remaining = _length - _position;
        if (remaining <= 0) return 0;
        if (count > remaining) count = (int)remaining;
        _baseStream.Seek(_baseOffset + _position, SeekOrigin.Begin);
        int read = _baseStream.Read(buffer, offset, count);
        _position += read;
        return read;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        long newPos = _position;
        if (origin == SeekOrigin.Begin) newPos = offset;
        else if (origin == SeekOrigin.Current) newPos = _position + offset;
        else if (origin == SeekOrigin.End) newPos = _length + offset;

        if (newPos < 0) newPos = 0;
        if (newPos > _length) newPos = _length;
        _position = newPos;
        _baseStream.Seek(_baseOffset + _position, SeekOrigin.Begin);
        return _position;
    }

    public override void SetLength(long value) { throw new NotSupportedException(); }
    public override void Write(byte[] buffer, int offset, int count) { throw new NotSupportedException(); }
}

public class SetupForm : Form
{
    private Label lblTitle;
    private Label lblSub;
    private Label lblStatus;
    private ProgressBar progressBar;
    private Button btnInstall;
    private Button btnClose;
    private TextBox txtInstallPath;
    private CheckBox chkDesktopShortcut;
    private CheckBox chkLaunchNow;

    public SetupForm()
    {
        this.Text = "Cài Đặt LIVE-BOAT RACING TIKTOK v2.0.0 — Duong Birken";
        try { this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        this.Size = new Size(580, 405);
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(7, 26, 34);
        this.ForeColor = Color.White;
        this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

        lblTitle = new Label();
        lblTitle.Text = "🐉 LIVE-BOAT RACING TIKTOK v2.0";
        lblTitle.Font = new Font("Segoe UI", 16f, FontStyle.Bold);
        lblTitle.ForeColor = Color.FromArgb(251, 191, 36);
        lblTitle.Location = new Point(28, 22);
        lblTitle.Size = new Size(520, 34);
        this.Controls.Add(lblTitle);

        lblSub = new Label();
        lblSub.Text = "Game Đua Ghe Ngo & Thuyền Rồng 34 Tỉnh Tương Tác Thời Gian Thực Chuẩn 9:16\\n23 Chặng Sông Bắc-Trung-Nam • 25 Giọng AI VieNeu-TTS & Edge TTS • Duong Birken";
        lblSub.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
        lblSub.ForeColor = Color.FromArgb(153, 246, 228);
        lblSub.Location = new Point(30, 60);
        lblSub.Size = new Size(520, 44);
        this.Controls.Add(lblSub);

        Label lblDir = new Label();
        lblDir.Text = "Thư mục cài đặt trên máy tính:";
        lblDir.ForeColor = Color.FromArgb(148, 163, 184);
        lblDir.Location = new Point(30, 116);
        lblDir.Size = new Size(260, 20);
        this.Controls.Add(lblDir);

        string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "LIVE-BoatRacing-Tiktok");
        txtInstallPath = new TextBox();
        txtInstallPath.Text = defaultDir;
        txtInstallPath.BackColor = Color.FromArgb(15, 39, 51);
        txtInstallPath.ForeColor = Color.White;
        txtInstallPath.BorderStyle = BorderStyle.FixedSingle;
        txtInstallPath.Location = new Point(30, 138);
        txtInstallPath.Size = new Size(505, 26);
        this.Controls.Add(txtInstallPath);

        chkDesktopShortcut = new CheckBox();
        chkDesktopShortcut.Text = "Tạo biểu tượng 'LIVE-BoatRacing-Tiktok' ngoài màn hình Desktop";
        chkDesktopShortcut.Checked = true;
        chkDesktopShortcut.ForeColor = Color.FromArgb(226, 232, 240);
        chkDesktopShortcut.Location = new Point(30, 176);
        chkDesktopShortcut.Size = new Size(505, 24);
        this.Controls.Add(chkDesktopShortcut);

        chkLaunchNow = new CheckBox();
        chkLaunchNow.Text = "Mở ngay Bảng Điều Khiển LIVE-BOAT RACING TIKTOK sau khi cài xong";
        chkLaunchNow.Checked = true;
        chkLaunchNow.ForeColor = Color.FromArgb(226, 232, 240);
        chkLaunchNow.Location = new Point(30, 202);
        chkLaunchNow.Size = new Size(505, 24);
        this.Controls.Add(chkLaunchNow);

        lblStatus = new Label();
        lblStatus.Text = "Sẵn sàng cài đặt (Đã tích hợp sẵn Node.js Runtime — Không cần cài thêm).";
        lblStatus.ForeColor = Color.FromArgb(52, 211, 153);
        lblStatus.Location = new Point(30, 238);
        lblStatus.Size = new Size(505, 22);
        this.Controls.Add(lblStatus);

        progressBar = new ProgressBar();
        progressBar.Location = new Point(30, 264);
        progressBar.Size = new Size(505, 22);
        progressBar.Minimum = 0;
        progressBar.Maximum = 100;
        progressBar.Value = 0;
        this.Controls.Add(progressBar);

        btnInstall = new Button();
        btnInstall.Text = "🚀 CÀI ĐẶT NGAY (1-CLICK INSTALL)";
        btnInstall.Font = new Font("Segoe UI", 10.5f, FontStyle.Bold);
        btnInstall.BackColor = Color.FromArgb(245, 158, 11);
        btnInstall.ForeColor = Color.FromArgb(15, 23, 42);
        btnInstall.FlatStyle = FlatStyle.Flat;
        btnInstall.FlatAppearance.BorderSize = 0;
        btnInstall.Location = new Point(30, 304);
        btnInstall.Size = new Size(375, 42);
        btnInstall.Cursor = Cursors.Hand;
        btnInstall.Click += BtnInstall_Click;
        this.Controls.Add(btnInstall);

        btnClose = new Button();
        btnClose.Text = "Đóng";
        btnClose.BackColor = Color.FromArgb(30, 58, 70);
        btnClose.ForeColor = Color.White;
        btnClose.FlatStyle = FlatStyle.Flat;
        btnClose.FlatAppearance.BorderSize = 0;
        btnClose.Location = new Point(415, 304);
        btnClose.Size = new Size(120, 42);
        btnClose.Cursor = Cursors.Hand;
        btnClose.Click += (s, e) => this.Close();
        this.Controls.Add(btnClose);
    }

    private void BtnInstall_Click(object sender, EventArgs e)
    {
        string targetDir = txtInstallPath.Text.Trim();
        if (string.IsNullOrEmpty(targetDir))
        {
            MessageBox.Show("Vui lòng chọn thư mục cài đặt hợp lệ!", "Thông báo", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        btnInstall.Enabled = false;
        txtInstallPath.Enabled = false;
        chkDesktopShortcut.Enabled = false;
        chkLaunchNow.Enabled = false;

        bool createShortcut = chkDesktopShortcut.Checked;
        bool launchAfter = chkLaunchNow.Checked;

        Thread worker = new Thread(() => RunInstallation(targetDir, createShortcut, launchAfter));
        worker.IsBackground = true;
        worker.Start();
    }

    private void UpdateUi(string status, int progress)
    {
        if (this.InvokeRequired)
        {
            this.BeginInvoke(new Action(() => UpdateUi(status, progress)));
            return;
        }
        lblStatus.Text = status;
        if (progress >= 0 && progress <= 100) progressBar.Value = progress;
    }

    private static void CreateShortcut(string shortcutPath, string targetExe, string workingDir, string description)
    {
        try
        {
            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            object shell = Activator.CreateInstance(shellType);
            object shortcut = shellType.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { shortcutPath });
            Type scType = shortcut.GetType();
            scType.InvokeMember("TargetPath", BindingFlags.SetProperty, null, shortcut, new object[] { targetExe });
            scType.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, shortcut, new object[] { workingDir });
            scType.InvokeMember("Description", BindingFlags.SetProperty, null, shortcut, new object[] { description });
            string customIco = Path.Combine(workingDir, "public", "assets", "app-icon.ico");
            string iconLoc = File.Exists(customIco) ? customIco : (targetExe + ",0");
            scType.InvokeMember("IconLocation", BindingFlags.SetProperty, null, shortcut, new object[] { iconLoc });
            scType.InvokeMember("Save", BindingFlags.InvokeMethod, null, shortcut, null);
        }
        catch { }
    }

    private static void StopRunningAppProcesses(string targetDir)
    {
        try
        {
            foreach (Process p in Process.GetProcessesByName("LIVE-BoatRacing-Tiktok"))
            {
                try { p.Kill(); p.WaitForExit(1500); } catch { }
            }
        }
        catch { }

        string normTarget = "";
        try { normTarget = Path.GetFullPath(targetDir).ToLowerInvariant(); } catch { normTarget = targetDir.ToLowerInvariant(); }

        try
        {
            foreach (Process p in Process.GetProcessesByName("node"))
            {
                bool shouldKill = false;
                try
                {
                    string exePath = p.MainModule.FileName.ToLowerInvariant();
                    if (!string.IsNullOrEmpty(normTarget) && exePath.StartsWith(normTarget))
                    {
                        shouldKill = true;
                    }
                }
                catch { }

                if (shouldKill)
                {
                    try { p.Kill(); p.WaitForExit(1500); } catch { }
                }
            }
        }
        catch { }

        Thread.Sleep(400);
    }

    private void RunInstallation(string targetDir, bool createShortcut, bool launchAfter)
    {
        try
        {
            UpdateUi("Đang kiểm tra và đóng tiến trình cũ (nếu có)...", 3);
            StopRunningAppProcesses(targetDir);

            string selfExe = Application.ExecutablePath;
            using (FileStream fs = new FileStream(selfExe, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (fs.Length < 24)
                    throw new Exception("File cài đặt không hợp lệ.");

                fs.Seek(fs.Length - 24, SeekOrigin.Begin);
                byte[] footer = new byte[24];
                fs.Read(footer, 0, 24);

                long zipOffset = BitConverter.ToInt64(footer, 0);
                long zipLength = BitConverter.ToInt64(footer, 8);
                string magic = Encoding.ASCII.GetString(footer, 16, 8);

                if (magic != "LBRTSFX1" || zipOffset <= 0 || zipLength <= 0)
                    throw new Exception("Không tìm thấy gói dữ liệu nén bên trong bộ cài đặt (Magic mismatch).");

                Directory.CreateDirectory(targetDir);

                using (SubStream sub = new SubStream(fs, zipOffset, zipLength))
                using (ZipArchive archive = new ZipArchive(sub, ZipArchiveMode.Read))
                {
                    int total = archive.Entries.Count;
                    int current = 0;

                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        current++;
                        int pct = (int)((current * 94L) / Math.Max(1, total));
                        if (current % 5 == 0 || current == total)
                        {
                            UpdateUi(string.Format("Đang cài đặt ({0}/{1}): {2}", current, total, entry.Name), pct);
                        }

                        string fullPath = Path.Combine(targetDir, entry.FullName.Replace('/', Path.DirectorySeparatorChar));
                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(fullPath);
                            continue;
                        }

                        string parentDir = Path.GetDirectoryName(fullPath);
                        if (!string.IsNullOrEmpty(parentDir))
                        {
                            Directory.CreateDirectory(parentDir);
                        }

                        try
                        {
                            using (Stream inStream = entry.Open())
                            using (FileStream outStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                            {
                                inStream.CopyTo(outStream);
                            }
                        }
                        catch (Exception)
                        {
                            bool written = false;
                            try
                            {
                                if (File.Exists(fullPath))
                                {
                                    string backupLocked = fullPath + ".old_" + Environment.TickCount;
                                    try { if (File.Exists(backupLocked)) File.Delete(backupLocked); } catch { }
                                    File.Move(fullPath, backupLocked);
                                }
                                using (Stream inStream = entry.Open())
                                using (FileStream outStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                                {
                                    inStream.CopyTo(outStream);
                                }
                                written = true;
                            }
                            catch { }

                            if (!written && !File.Exists(fullPath))
                            {
                                throw;
                            }
                        }
                    }
                }
            }

            string launcherExe = Path.Combine(targetDir, "LIVE-BoatRacing-Tiktok.exe");

            if (createShortcut && File.Exists(launcherExe))
            {
                UpdateUi("Đang tạo biểu tượng ngoài màn hình Desktop...", 97);
                string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                CreateShortcut(
                    Path.Combine(desktopDir, "LIVE-BoatRacing-Tiktok.lnk"),
                    launcherExe,
                    targetDir,
                    "LIVE-BOAT RACING TIKTOK v2.0 — Game Đua Ghe 34 Tỉnh"
                );

                string startMenuDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                CreateShortcut(
                    Path.Combine(startMenuDir, "LIVE-BoatRacing-Tiktok.lnk"),
                    launcherExe,
                    targetDir,
                    "LIVE-BOAT RACING TIKTOK v2.0 — Game Đua Ghe 34 Tỉnh"
                );
            }

            UpdateUi("✅ Cài đặt hoàn tất 100%! Đang mở LIVE-BOAT RACING TIKTOK...", 100);

            if (launchAfter && File.Exists(launcherExe))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = launcherExe,
                    WorkingDirectory = targetDir,
                    UseShellExecute = true
                });
            }

            this.BeginInvoke(new Action(() =>
            {
                MessageBox.Show(
                    "🎉 Đã cài đặt thành công LIVE-BOAT RACING TIKTOK v2.0!\\n\\n" +
                    "👉 Biểu tượng 'LIVE-BoatRacing-Tiktok' đã được tạo ngoài màn hình Desktop.\\n" +
                    "👉 Bảng điều khiển đang tự động mở tại http://localhost:3010",
                    "Cài Đặt Hoàn Tất",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
                this.Close();
            }));
        }
        catch (Exception ex)
        {
            this.BeginInvoke(new Action(() =>
            {
                btnInstall.Enabled = true;
                UpdateUi("❌ Lỗi cài đặt: " + ex.Message, 0);
                MessageBox.Show("Lỗi trong quá trình cài đặt:\\n" + ex.Message, "Lỗi Cài Đặt", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }));
        }
    }

    [STAThread]
    public static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new SetupForm());
    }
}
`;
  const tempCs = path.join(BUILD_TMP, '_TempSetupStub.cs');
  fs.writeFileSync(tempCs, csSource, 'utf8');
  const cscArgs = [
    '/target:winexe',
    '/optimize+',
    `/out:${outputStubPath}`,
    '/r:System.dll',
    '/r:System.Drawing.dll',
    '/r:System.Windows.Forms.dll',
    '/r:System.IO.Compression.dll',
    '/r:System.IO.Compression.FileSystem.dll',
  ];
  if (fs.existsSync(iconPath)) {
    cscArgs.push(`/win32icon:${iconPath}`);
  }
  cscArgs.push(tempCs);
  execFileSync(cscPath, cscArgs);
  fs.unlinkSync(tempCs);
}

async function main() {
  console.log('======================================================================');
  console.log('  📦 ĐANG ĐÓNG GÓI BỘ CÀI ĐẶT WINDOWS (.EXE) — LIVE-BOAT RACING TIKTOK');
  console.log('======================================================================');

  fs.mkdirSync(RELEASE_DIR, { recursive: true });
  if (fs.existsSync(BUILD_TMP)) {
    fs.rmSync(BUILD_TMP, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  const cscPath = findCscExe();
  console.log('  [1/7] Đang tạo biểu tượng ứng dụng (public/assets/app-icon.ico)...');
  const iconPath = await ensureAppIcon();

  console.log('  [2/7] Đang biên dịch giao diện Frontend Production (vite build)...');
  execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

  console.log('  [3/7] Đang đóng gói máy chủ server.ts -> server.cjs độc lập (esbuild)...');
  const serverCjsPath = path.join(STAGE_DIR, 'server.cjs');
  const esbuildCmd = [
    'npx',
    'esbuild',
    'server.ts',
    '--bundle',
    '--platform=node',
    '--target=node20',
    '--format=cjs',
    '--external:vite',
    '--banner:js="const import_meta_url = require(\'url\').pathToFileURL(__filename).href;"',
    '--define:import.meta.url=import_meta_url',
    `--outfile="${serverCjsPath}"`,
  ].join(' ');
  execSync(esbuildCmd, { cwd: ROOT_DIR, stdio: 'inherit' });

  console.log('  [4/7] Đang sao chép tài nguyên (dist, public/assets, tools, hướng dẫn)...');
  copyRecursiveSync(path.join(ROOT_DIR, 'dist'), path.join(STAGE_DIR, 'dist'));
  copyRecursiveSync(path.join(ROOT_DIR, 'public'), path.join(STAGE_DIR, 'public'));
  copyRecursiveSync(path.join(ROOT_DIR, 'tools', 'vieneu-worker.py'), path.join(STAGE_DIR, 'tools', 'vieneu-worker.py'));

  for (const f of ['package.json', 'BAT-LIVE.bat', 'CAI-GIONG-ADAM.bat', 'README.md', 'HUONG-DAN-SU-DUNG.md']) {
    const src = path.join(ROOT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(STAGE_DIR, f));
    }
  }

  console.log('  [5/7] Đang nhúng Node.js Runtime độc lập (runtime/node.exe)...');
  const runtimeDir = path.join(STAGE_DIR, 'runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.copyFileSync(process.execPath, path.join(runtimeDir, 'node.exe'));

  console.log('  [6/7] Đang biên dịch Launcher Native Windows: LIVE-BoatRacing-Tiktok.exe...');
  const stageLauncherExe = path.join(STAGE_DIR, 'LIVE-BoatRacing-Tiktok.exe');
  compileAppLauncherExe(cscPath, iconPath, stageLauncherExe);
  fs.copyFileSync(stageLauncherExe, ROOT_LAUNCHER_EXE);

  console.log('  [7/7] Đang nén Payload và tạo bộ cài đặt 1-Click: LIVE-BoatRacing-Tiktok-v2.0.0-Setup.exe...');
  const payloadZipPath = path.join(BUILD_TMP, '_payload.zip');
  execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${STAGE_DIR.replace(/'/g, "''")}', '${payloadZipPath.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`,
    { stdio: 'inherit' }
  );

  const stubExePath = path.join(BUILD_TMP, '_SetupStub.exe');
  compileSetupStubExe(cscPath, iconPath, stubExePath);

  const stubBuf = fs.readFileSync(stubExePath);
  const zipStat = fs.statSync(payloadZipPath);
  const zipOffset = BigInt(stubBuf.length);
  const zipLength = BigInt(zipStat.size);

  const footerBuf = Buffer.alloc(24);
  footerBuf.writeBigInt64LE(zipOffset, 0);
  footerBuf.writeBigInt64LE(zipLength, 8);
  footerBuf.write('LBRTSFX1', 16, 8, 'ascii');

  const outFd = fs.openSync(SETUP_EXE_PATH, 'w');
  fs.writeSync(outFd, stubBuf);

  const zipFd = fs.openSync(payloadZipPath, 'r');
  const chunkBuf = Buffer.alloc(4 * 1024 * 1024);
  let bytesRead = 0;
  while ((bytesRead = fs.readSync(zipFd, chunkBuf, 0, chunkBuf.length, null)) > 0) {
    fs.writeSync(outFd, chunkBuf, 0, bytesRead);
  }
  fs.closeSync(zipFd);
  fs.writeSync(outFd, footerBuf);
  fs.closeSync(outFd);

  // Dọn thư mục tạm
  fs.rmSync(BUILD_TMP, { recursive: true, force: true });

  const sizeMb = (fs.statSync(SETUP_EXE_PATH).size / (1024 * 1024)).toFixed(2);
  console.log('======================================================================');
  console.log('  🎉 ĐÃ TẠO THÀNH CÔNG BỘ CÀI ĐẶT WINDOWS (.EXE)!');
  console.log(`  💿 Bộ cài đặt 1-Click: ${SETUP_EXE_PATH} (${sizeMb} MB)`);
  console.log(`  🚀 Launcher trực tiếp: ${ROOT_LAUNCHER_EXE}`);
  console.log('======================================================================');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
