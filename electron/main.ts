import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";

// ESM doesn't have __dirname — recreate it from import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let nextProcess: ChildProcess | null;

function startNext() {
  const serverPath = path.join(
    __dirname,
    "../.next/standalone/server.js"
  );

  nextProcess = spawn("node", [serverPath], {
    env: { ...process.env, PORT: "3000" }
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