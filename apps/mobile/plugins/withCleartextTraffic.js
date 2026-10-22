// Resolved through the expo package so pnpm's strict node_modules layout works
// during Gradle's config-plugin evaluation as well as during prebuild.
const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Allows self-hosted OpenMuse servers on a LAN over plain HTTP.
 * Public deployments should use HTTPS; the app warns before connecting to an
 * unencrypted remote address. Remove this plugin to enforce HTTPS-only builds.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) application.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
