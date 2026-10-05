**[Download the current unified release](https://github.com/GronedWaffel/gta-v-ps5-menu/releases/tag/v1.1.0)** · [YouTube builder](https://sniperscheats.lol/builder/) · [Payloads](https://sniperscheats.lol/payloads/)

> **Unified PS5 11.00–13.60 release.** Exact targets: 11.00, 11.20, 11.60, 12.00, 12.02, 12.20, 12.40, 12.60, 12.70, 13.00, 13.20, 13.40, 13.42, 13.60. 11.40 and firmware below 11.00 are excluded. Earlier hardware validation remains scoped; not every feature is tested on every profile.

The same two GTA executable profiles and Story Mode checks still apply. Firmware support does not add other GTA versions or GTA Online. The native loader uses PS5 Payload SDK 0.43 firmware tables; game fingerprints remain mandatory.

# GTA V — PS5 Story Mode menu

An independent Windows app that installs a controller-operated menu inside GTA V on PS5. Run **GTA V.exe**, enter your console IP, and click **Install in-game menu**. Press **L1 + D-pad Right** in GTA.

No PS Neighborhood installation or MCP bridge is needed. The app connects directly to **PS5Debug-NG 1.3.2**. Once installed, the menu runs inside the game and the PC app can close.

This project targets the listed jailbroken **PS5 11.00–13.60 profiles**. Executable profiles are included for **PPSA04263 / 01.000.000** and **PPSA04264 / 01.010.002**. The installer checks executable fingerprints and refuses other builds. It also refuses installation outside an active Story Mode character. This is not a GTA Online menu.

## Which download?

Use **GTA-V-1.1.0-win-x64.zip** for either supported game build:

- **PPSA04263 — 01.000.000**
- **PPSA04264 — 01.010.002**

The app detects the running executable and selects its matching profile automatically. **v1.1.0 is the trainer release version, not the GTA version.** Both profiles are included in the same download.

## Controls

- **L1 + D-pad Right:** open or close.
- **D-pad Up/Down:** navigate vertical lists; hold to repeat.
- **Cross:** select or toggle.
- **Circle:** back or cancel.
- Movement and camera controls remain available while browsing.

## Options

- Player: god mode, infinite clip, infinite ammo, super run, super jump, Never Wanted and seatbelt.
- Weapons: weapon catalogue, give all weapons and explosive ammo.
- Garage: categorized vehicle spawner with model preloading, performance upgrades, vehicle god mode, horn boost, driving on water and increased ground force.
- Character: model changer and clothing components/colors with a live character-camera preview, keep and cancel.
- World: waypoint teleport with destination/ground streaming, weather, time, walking radio and phone suppression.
- Story: add $10 million, max skills, cash pickups, achievement requests and exact-build Prologue recovery.

Actions that affect progression require confirmation in the menu and can affect autosaves. Trophy requests are requests to the game; they do not guarantee every trophy will unlock. Vehicle availability depends on installed content. Prefetched models can spawn immediately; cold models still depend on GTA's asset streaming.

## Loading and removal

1. Start the jailbreak and your game-loading services, plus **PS5Debug-NG 1.3.2**. Do not load a duplicate debugger.
2. Open GTA and enter unpaused Story Mode with a living character.
3. Extract the Windows ZIP, keep the whole folder together, and run **GTA V.exe**. No Node.js installation is needed.
4. Enter your PS5 IP and debugger port (normally **744**). **Check connection** verifies the game without changing memory.
5. Click **Install in-game menu** and wait for confirmation. Open the menu with the controller shortcut; you can close the PC app.

Reinstall after restarting GTA. Restart **GTA** before switching from an ELF or another menu build. The app recognizes its own saved installation and refuses unknown hooks. Closing GTA removes the menu. It never restarts the console or loads other payloads.

Settings and recovery information stay locally in `%APPDATA%/GTA-V-Menu`. No telemetry, HTTP server or external account is used.

## Source and builds

See [BUILDING.md](BUILDING.md), [CREDITS.md](CREDITS.md) and [VALIDATION.md](VALIDATION.md). Source, matching profile data and build scripts are included; no game executable, game archive, save or memory dump is distributed.

Pull requests and additional verified game profiles are welcome. Report title ID, full game version, firmware, the exact option/model and observed behavior. Include the exact error displayed by the app; do not upload game files or memory dumps.

GPL-3.0-or-later. An independent homebrew project by GronedWaffel; not affiliated with Rockstar Games or Sony Interactive Entertainment.
