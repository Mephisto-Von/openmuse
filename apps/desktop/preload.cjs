const { contextBridge } = require("electron");

// Optional deployment default. A server address saved in the app takes precedence.
const apiUrl = (process.env.OPENMUSE_API_URL || "").trim();
if (apiUrl) contextBridge.exposeInMainWorld("__OPENMUSE_API_URL__", apiUrl);
