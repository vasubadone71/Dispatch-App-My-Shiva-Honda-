# Enterprise React Native + Expo Anti-Piracy Hardening Guide

For a commercial Dealership Management System, securing the APK from reverse-engineering, repackaging, and cloning is a critical business requirement.

---

## 1. JavaScript Hardening via Hermes Engine

By default, React Native packages JavaScript as plain text within the application bundle. Anyone who decompiles the APK can read 100% of your source code.

**Solution**: The **Hermes Engine** compiles JavaScript into optimized **binary bytecode** at build time. Decompiling a Hermes APK yields only compiled binary structures instead of readable JS code.

### How to Enforce Hermes in Expo SDK 54:
Ensure your `app.json` has `hermes` configured as the JS engine (it is the default for new Expo projects, but explicitly declared here for certainty):

```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

---

## 2. Code Minification and Obfuscation

You must instruct the Android compilation toolchain to run **Proguard/R8**. Proguard minifies code, strips unused classes/variables, and replaces descriptive variables (like `activateLicenseOnline`) with generic short labels (like `a`, `b()`).

### Configuration in Expo (Prebuild / EAS)
When building locally or via EAS Build, optimization is enabled automatically in the `release` build type.

To customize Proguard rules, you can create a custom Proguard rules file in your android project directory (`android/app/proguard-rules.pro`):

```proguard
# Obfuscate all security-sensitive custom models and classes
-keep class com.myshivahonda.dispatch.security.** { *; }

# Enable aggressive optimization
-repackageclasses 'a'
-allowaccessmodification
```

To load these rules in Expo, configure them using the Expo build properties config plugin if you are building inside EAS, or simply write them to the native gradle setup.

---

## 3. Production Build Hardening Configurations

Configure your `eas.json` for hardened production releases:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "release": {
        "minify": true,
        "shrinkResources": true
      }
    }
  }
}
```

### Steps to Compile a Secure Hardened APK:
Run the following CLI command to compile your production-grade, minified, Hermes-bytecoded APK:

```bash
eas build --platform android --profile production --local
```

This will run R8 obfuscation, Hermes JS engine compilation, and produce a highly secure, optimized APK ready for deployment to Badone Motors' dealership devices.
