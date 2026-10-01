# Building GTA V

## Windows app

Use Node.js 24 on Windows. Run npm ci, npm start, then npm run package.
Output: dist/GTA-V-1.0.0-win-x64/GTA V.exe. Keep the output folder together.
Electron is a build dependency; the packaged app includes its runtime and has no PS Neighborhood dependency. Set ELECTRON_DIST to an existing Electron distribution if needed when packaging.

Run node --test tests/connection.test.mjs tests/profiles.test.mjs for direct-adapter and profile checks.
The checked-in menu binaries are our compiled resident code, not game executables. To rebuild, install Zig 0.14.1, set ZIG to its executable, and run npm run build:menu. Zig can also be available on PATH. Native tests run with node --test tests/native.test.mjs; experimental installer tests also require generated build headers.

src/gta-native-bridge.mjs preserves the working desktop install path: executable and Story Mode verification, PS5Debug allocation, checked image writes, and one native-slot publication. src/connection.mjs replaces the companion app bridge with a private direct debugger connection. The renderer can request only connection checking and installation.

## Experimental ELF source

payload/ and vendor/libNineS/ retain the ELF work for reference. It is not the release delivery method: model streaming and clothing preview regressions remained unresolved. Do not distribute its output as the supported build.
To reproduce the experiment, set ZIG and PS5_PAYLOAD_SDK (SDK v0.43 from ps5-payload-dev/sdk), then run npm run build:elf. Output: build/GTA-V.elf.

New profiles require native registration/layout verification, executable fingerprints and hardware testing. Changing the title/version alone is insufficient.
