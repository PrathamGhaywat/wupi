import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";

// In production (asar-packed), __dirname points inside the asar which
// regular `node` can't read. Resolve to the unpacked counterpart instead.
const appPath = app.getAppPath();
const basePath = appPath.endsWith(".asar")
  ? appPath.replace(".asar", ".asar.unpacked")
  : path.dirname(fileURLToPath(import.meta.url));

let nextProcess: ChildProcess | null;

function startNext() {
  const serverPath = path.join(basePath, ".next", "standalone", "server.js");

  nextProcess = spawn("node", [serverPath], {
    env: { ...process.env, PORT: "3000" },
    stdio: "inherit"
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800
  });

  win.loadURL("http://localhost:3000");
}

app.whenReady().then(() => {
  startNext();
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextProcess) nextProcess.kill();
  app.quit();
});
