import { app, BrowserWindow } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import isDev from "electron-is-dev";

// In production (asar-packed), resolve to the unpacked counterpart.
// In dev, app.getAppPath() returns the electron/ dir — go up to project root.
const appPath = app.getAppPath();
const basePath = appPath.endsWith(".asar")
  ? appPath.replace(".asar", ".asar.unpacked")
  : fs.existsSync(path.join(appPath, ".next"))
    ? appPath
    : path.dirname(appPath);

let nextProcess: ChildProcess | null;

function startNext() {
  const serverPath = path.join(basePath, ".next", "standalone", "server.js");

  nextProcess = spawn("node", [serverPath], {
    env: { ...process.env, PORT: "3000" },
    stdio: "inherit",
    detached: true
  });

  nextProcess.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") nextProcess = null;
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
  if (!isDev) {
    startNext();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (nextProcess && nextProcess.pid) {
    process.kill(-nextProcess.pid);
  }
  app.quit();
});
