# My Shiva Honda - Dealership Management System (DMS)

An offline-first, highly secure, and beautifully designed **React Native & Expo** mobile application developed for **Badone Motors Private Limited (My Shiva Honda)**, an authorized Honda 2-wheelers dealership located in **Biaora, Rajgarh, Madhya Pradesh**.

This application serves as a comprehensive Dealership Management System (DMS) to streamline vehicle dispatches, track inventory flows, generate ready-to-share PDF invoice receipts & Excel spreadsheets, manage dealerships/sub-dealer network masters, and enforce strict device-based enterprise license verification.

---

## 📸 Overview & Purpose

At its core, **My Shiva Honda App** simplifies the daily dispatching operations of Honda two-wheelers to sub-dealers or network partners. By storing business data locally using **AsyncStorage**, it guarantees frictionless operational workflows even in remote areas with limited internet access, while employing **SecureStore** for tamper-proof licensing and hardware authorization.

* **Primary Dealer Agency**: Badone Motors Private Limited (My Shiva Honda)
* **Address**: 00, Ward No 6, Biaora Bus Stand Guna Road, Biaora, Rajgarh, Madhya Pradesh - 465674
* **Contact Number**: +91-9425038999

---

## 🚀 Key Features

### 📦 1. Live Dispatch Management
* **Bulk Dispatch Builder**: Create new dispatches for multiple two-wheelers in a single form.
* **Auto-Calculation Engine**: Automatically calculate sub-dealer pricing, discount rates, and final billing totals.
* **Chassis & Engine Scanning**: Input fields to capture unique Frame Numbers, Engine Numbers, Ex-Showroom Prices, and discounts.

### 🏢 2. Sub-Dealer & Master Directory Database
* **Sub-Dealer Network Registry (Network Master)**: Add, edit, and maintain network dealer registries (names, cities, owners, contact numbers).
* **Model Master Registry**: Keep a curated database of Honda motorcycle & scooter models along with default base pricing.
* **Color Master Registry**: Maintain a database of official Honda colorways to associate with dispatches.

### 📄 3. Instant Document Generators
* **PDF Dispatch Challans/Invoices**: Branded PDF generated natively (via `expo-print`) containing official logos and dealership details.
* **Excel Spreadsheets (XLSX)**: Clean, tabular format exported instantly (via `xlsx`) for bookkeeping, ready to share on WhatsApp or Email using native device sharing options.

### 🛡️ 4. Security & Device-Lock Licensing System
* **Hardware Fingerprint Authorization**: Displays a unique 16-hex Device ID derived from hardware-specific identifiers (Android ID, Vendor ID, device brand, model, and OS).
* **Offline Code Generator (`admin_generator.html`)**: An offline admin dashboard tool that salts and hashes the Device ID using SHA-256 to generate secure activation codes (`MSH-XXXX-YYYY`).
* **Verification Engine**: Compares the secure store license hash against the live hardware fingerprint on every boot, blocking unauthorized APK clones or shared installations.
* **Environment Integrity Protection**: Block execution on emulators (in production mode), intercept active debugger attachments, and run code-level checks.

### 🌐 5. Online Supabase Sync & Telegram Notifications
* **Supabase Client REST/RPC Client**: Supports online activation requests, activation code validation, and a 7-day periodic license check using PostgreSQL RPC procedures.
* **Telegram Admin Bot Integrations**: Sends real-time activation alerts to the admin's Telegram chat containing complete dealer profile metrics, device specifications, and a direct PostgREST database execution command for approval.
* **POST-Based RPC Approvals**: Uses secure HTTP POST RPCs on Supabase to ensure read-write database transactions succeed (replacing unstable read-only GET requests).

---

## 🛠️ Technology Stack & Dependencies

The app is built on modern, lightweight, and robust libraries ensuring stellar performance:

* **Framework**: React Native with **Expo (v54.0.34)**
* **React Core**: React 19.1.0 & React Native 0.81.5
* **Navigation**: `@react-navigation/native` & `@react-navigation/native-stack` (Native Screen Transitions, React Navigation v7)
* **Storage**: 
  - `@react-native-async-storage/async-storage` (Fast, structured, offline-first JSON storage for business data)
  - `expo-secure-store` (Encrypted keychain storage for licensing profiles and cryptographic device hashes)
* **Integrations**:
  - `@supabase/supabase-js` for communicating with the Supabase database
  - Native `fetch` API for Telegram Bot API communication
  - `expo-application`, `expo-crypto`, and `expo-device` for hardware fingerprint generation and hashing
* **Design & Styling**: Pure React Native StyleSheet with custom HSL/RGB tailored palette mimicking premium Honda aesthetic guidelines.
* **Utility Libraries**:
  - `xlsx` for Excel workbook generation and base64 string conversion.
  - `expo-print` & `expo-sharing` for generating print documents and triggering OS-level share dialogs.
  - `expo-linear-gradient` for premium looking UI components and buttons.

---

## 📂 Directory Structure

Here is a structured overview of the workspace:

```text
├── DispatchApp/                 # Main React Native/Expo project directory
│   ├── .expo/                   # Expo configuration and cache directory
│   ├── assets/                  # Local static assets, icons, and fonts
│   ├── logo.png                 # Official My Shiva Honda company logo
│   ├── src/                     # Application Source Code
│   │   ├── api/                 # Backend integrations
│   │   │   ├── supabase.js           # Supabase REST/RPC Client
│   │   │   └── supabaseClient.js     # Client configuration and setup
│   │   ├── components/          # Reusable styled UI elements (cards, headers, buttons)
│   │   ├── licensing/           # Licensing logic
│   │   │   ├── licenseManager.js     # Activation check, validation, and storage logic
│   │   │   └── licenseService.js     # Helper interface for state checks
│   │   ├── navigation/          # Navigation routers & Stack configurator
│   │   │   └── Router.js             # Route config mapping app states to screen stacks
│   │   ├── screens/             # UI Screens
│   │   │   ├── HomeScreen.js         # Interactive dashboard metrics & quick actions
│   │   │   ├── NetworkMasterScreen.js# Sub-dealer directory editor
│   │   │   ├── ModelMasterScreen.js  # Vehicle model master database editor
│   │   │   ├── ColorMasterScreen.js  # Color master editor
│   │   │   ├── NewDispatchScreen.js  # Dispatch builder / Challan compiler
│   │   │   ├── HistoryScreen.js      # Logbook of previous dispatches with search/export
│   │   │   ├── ActivationScreen.js   # Locked screen showing unique Device ID
│   │   │   ├── EnterActivationCodeScreen.js # Code input and validation form
│   │   │   ├── UnauthorizedDeviceScreen.js # Lock screen for mismatched hardware fingerprints
│   │   │   ├── VerificationPendingScreen.js # Online wait screen for admin approval
│   │   │   ├── LicenseExpiredScreen.js # Notice of license expiration
│   │   │   └── LockScreen.js         # General fallback app blocker
│   │   ├── security/            # Security Hardening
│   │   │   ├── SecurityProvider.js   # React Context wrapper managing appState
│   │   │   ├── antiPiracy.js         # Debugger, signature, and environment validation
│   │   │   ├── antiPiracyGuide.md    # Guide for R8, Proguard, and EAS hardening
│   │   │   ├── device.js             # Standard SHA-256 fingerprint engine
│   │   │   └── deviceVerification.js # Verification logic of hardware values
│   │   ├── services/            # Messaging Services
│   │   │   └── telegramService.js    # Telegram admin bot reporting service
│   │   ├── storage/             # Secure Key Storage
│   │   │   ├── secureStorage.js      # SecureStore helper functions
│   │   │   └── secureStore.js        # Basic storage wrappers
│   │   ├── theme/               # Core design tokens
│   │   │   └── colors.js             # Dealership theme colors (Classic Red, Dark Gray, Accents)
│   │   └── utils/               # Helper modules
│   │       ├── storage.js            # Async storage wrappers & key definitions
│   │       ├── pdfGenerator.js       # Native HTML-to-PDF compiler and sharer
│   │       └── excelGenerator.js     # Workbook creator to generate excel xlsx files
│   ├── package.json             # App dependencies & run scripts
│   └── app.json                 # Expo app configuration
│
│── Marketing/                   # Promotional materials for the dealership
│   ├── hero.png                 # Main visual banner for campaigns
│   ├── poster.html              # Marketing poster templates (English)
│   └── poster_hindi.html        # Marketing poster templates (Hindi translation)
│
│── Test/                        # Technical files, specifications & documents
│   └── [hash-id].pdf            # Technical reference file
│
├── admin_generator.html         # Admin offline activation key generator
├── package.json                 # Workspace root package configurations
└── README.md                    # Project Documentation (You are here!)
```

---

## 🎨 Theme & Visual Palette

The visual language follows Honda's prestigious heritage with high-contrast, premium dark accents and warm highlights:

* **Primary Honda Red**: `#CC0000` (Used for headers, indicators, branding)
* **Red Gradient**: `#B30000` ➡️ `#FF3333` (For primary interactive buttons)
* **Dark Obsidian**: `#1A1A1A` (Premium dark text/background elements)
* **Clean Light Base**: `#F8F9FA` & `#FFFFFF` (For high-contrast card structures and page backgrounds)
* **Success Green**: `#00C851` (For positive totals and success indicators)

---

## 🔒 Enterprise Obfuscation & Hardening

Securing the package from repackaging, cloning, and reverse-engineering is built directly into the build pipeline:

1. **JS Hermes Bytecode**: JavaScript is compiled into Hermes bytecode at build time, preventing raw JS source extraction from compiled APKs (`jsEngine: "hermes"` in `app.json`).
2. **Minification & Obfuscation (R8/Proguard)**: Configured via build profile rules to minify classes/variables and package custom security classes securely.
3. **Hardened Production Profile**: EAS build profile is configured in `eas.json` for production optimization:
   ```bash
   eas build --platform android --profile production --local
   ```

---

## 🏃 Getting Started & Local Setup

To run this application locally, ensure you have **Node.js** (v18+ recommended) and **npm** installed.

### 1. Install Dependencies
Navigate to the `DispatchApp` folder and install the required node modules:

```bash
cd DispatchApp
npm install
```

### 2. Launch the Expo Development Server
You can launch the dev server directly from the root workspace or from the subdirectory:

* **From the Workspace Root Directory**:
  ```bash
  npm start
  ```
  *(This calls `cd DispatchApp && npx expo start -c` under the hood)*

* **From the `DispatchApp` Subdirectory**:
  ```bash
  npx expo start
  ```

### 3. Run on Mobile Device or Emulator
Once the Expo server starts, a QR code will be displayed in the terminal:
* **Android**: Install the **Expo Go** application from the Google Play Store, open the app, and scan the QR code.
* **iOS**: Install the **Expo Go** application from the Apple App Store, open your camera app, and scan the QR code.
* **Emulators**: Press `a` in the terminal to load the application on an active Android Emulator or `i` for iOS Simulator.

---

## 📊 Storage Schemas

### 1. AsyncStorage (Local Business Data)
Data structures inside local `AsyncStorage` are structured as JSON arrays under the following namespace keys:

| Data Entity | AsyncStorage Key | Attributes |
| :--- | :--- | :--- |
| **Networks** | `@networks_master` | `id`, `networkName`, `city`, `ownerName`, `contactNumber` |
| **Models** | `@models_master` | `id`, `modelName`, `price` |
| **Colors** | `@colors_master` | `id`, `colorName` |
| **History** | `@dispatch_history` | `id`, `network`, `date`, `vehicleNo`, `items[]`, `totalAmount` |

### 2. SecureStore (Encrypted Activation & Hardware Data)
Cryptographic and profile metadata keys stored securely:

| Data Entity | SecureStore Key | Value Type | Attributes |
| :--- | :--- | :--- | :--- |
| **Licensing Profile** | `msh_dealer_profile` | JSON String | `activationStatus`, `activationCode`, `deviceHash`, `dealerProfile` |

---

## 📝 Contribution & Author Info

* **Developer Partner**: Advanced Agentic Coding - Antigravity Agent
* **Dealership**: My Shiva Honda (Badone Motors Private Limited)
* **Location**: Biaora, Madhya Pradesh, India
