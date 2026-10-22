import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, Menu, session, shell } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDirectory = path.join(__dirname, "..", "renderer");
// Fixed so a self-hosted server can allowlist the desktop origin once.
const APP_PORT = 41737;
const APP_ORIGIN = `http://127.0.0.1:${APP_PORT}`;
const documentationUrl = "https://github.com/CopilotKit/OpenMuse";
const issueUrl = "https://github.com/CopilotKit/OpenMuse/issues";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http: https:",
    "media-src 'self' blob: http: https:",
    "font-src 'self' data:",
    "connect-src 'self' http: https: ws: wss:",
    "frame-src http: https: blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

async function resolveAsset(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, APP_ORIGIN).pathname);
  } catch {
    return null;
  }
  if (pathname === "/") pathname = "/index.html";
  const candidate = path.normalize(path.join(rendererDirectory, pathname));
  if (!candidate.startsWith(`${rendererDirectory}${path.sep}`)) return null;
  try {
    if ((await stat(candidate)).isFile()) return candidate;
  } catch {
    // Fall through to the single-page app entry point.
  }
  const entry = path.join(rendererDirectory, "index.html");
  try {
    return (await stat(entry)).isFile() ? entry : null;
  } catch {
    return null;
  }
}

function startStaticServer() {
  const server = createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    const file = await resolveAsset(request.url ?? "/");
    if (!file) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("OpenMuse desktop assets are missing.");
      return;
    }
    const headers = {
      ...securityHeaders,
      "Content-Type": contentTypes[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": path.basename(file) === "index.html" ? "no-store" : "public, max-age=3600",
    };
    response.writeHead(200, headers);
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(file)
      .on("error", () => response.destroy())
      .pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(APP_PORT, "127.0.0.1", () => resolve(server));
  });
}

let mainWindow;
let staticServer;

function openExternal(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") void shell.openExternal(url);
  } catch {
    // Ignore malformed or non-web links.
  }
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Reset server address…",
          click: async () => {
            if (!mainWindow) return;
            const choice = dialog.showMessageBoxSync(mainWindow, {
              type: "question",
              buttons: ["Cancel", "Reset"],
              defaultId: 0,
              cancelId: 0,
              message: "Reset the server address?",
              detail:
                "OpenMuse will return to the welcome screen so you can enter a different server URL.",
            });
            if (choice !== 1) return;
            await mainWindow.webContents.session.clearStorageData({ storages: ["localstorage"] });
            mainWindow.reload();
          },
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged ? [] : [{ type: "separator" }, { role: "toggleDevTools" }]),
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, ...(isMac ? [{ role: "front" }] : [])],
    },
    {
      label: "Help",
      submenu: [
        { label: "OpenMuse documentation", click: () => openExternal(documentationUrl) },
        { label: "Report an issue", click: () => openExternal(issueUrl) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: "#FCFCFC",
    title: "OpenMuse",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(`${APP_ORIGIN}/`) || url === APP_ORIGIN) return;
    event.preventDefault();
    openExternal(url);
  });
  mainWindow.webContents.on("will-attach-webview", (event) => event.preventDefault());

  mainWindow.loadURL(APP_ORIGIN).catch((error) => {
    dialog.showErrorBox("OpenMuse could not start", String(error));
    app.quit();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.enableSandbox();
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    session.defaultSession.setPermissionCheckHandler(() => false);

    try {
      staticServer = await startStaticServer();
    } catch (error) {
      dialog.showErrorBox(
        "OpenMuse could not start",
        `The local desktop UI could not start on port ${APP_PORT}. Close any other copy of OpenMuse and try again.\n\n${String(error)}`,
      );
      app.quit();
      return;
    }

    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", () => staticServer?.close());
}
