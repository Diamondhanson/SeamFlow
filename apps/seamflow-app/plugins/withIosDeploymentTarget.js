// ============================================================================
// Sets the iOS deployment target — the minimum iOS version the app installs on.
//
// WHY THIS EXISTS
//
// expo-speech-recognition's podspec asks for iOS 16.4. Expo's autolinking
// compares the deployment target as well as the platform name, so with the
// default target (15.1) it SILENTLY LEAVES THE MODULE OUT: no warning, the build
// succeeds, and the app ships without the native half of voice input. The JS then
// can't find it ("Cannot find native module 'ExpoSpeechRecognition'") and the mic
// on the assistant screen is dead on every iPhone build.
//
// expo-build-properties does this job too, but is not installed, and pulling a
// new dependency into the hoisted monorepo isn't worth it for two settings. This
// does exactly what it does for `ios.deploymentTarget`:
//   1. Podfile.properties.json — read by the Podfile's `platform :ios` line, which
//      is what autolinking compares against.
//   2. IPHONEOS_DEPLOYMENT_TARGET on the app's Xcode build configurations, so the
//      app target and the pods agree.
//
// Usage in app.json:  ["./plugins/withIosDeploymentTarget", { "deploymentTarget": "16.4" }]
// ============================================================================

const { withPodfileProperties, withXcodeProject } = require('expo/config-plugins');

module.exports = function withIosDeploymentTarget(config, props) {
  const deploymentTarget = props && props.deploymentTarget;
  if (typeof deploymentTarget !== 'string' || !/^\d+(\.\d+)?$/.test(deploymentTarget)) {
    throw new Error(
      `withIosDeploymentTarget: "deploymentTarget" must be a version string like "16.4", got ${JSON.stringify(deploymentTarget)}`,
    );
  }

  config = withPodfileProperties(config, (c) => {
    c.modResults['ios.deploymentTarget'] = deploymentTarget;
    return c;
  });

  config = withXcodeProject(config, (c) => {
    const configurations = c.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const settings = configurations[key] && configurations[key].buildSettings;
      if (settings && settings.IPHONEOS_DEPLOYMENT_TARGET) {
        settings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
      }
    }
    return c;
  });

  return config;
};
