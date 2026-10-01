# Validation record

2026-10-01, PS5 firmware 13.60.

The resident menu was user-tested on PPSA04263 / 01.000.000 and PPSA04264 / 01.010.002 using the original PC installer. The user confirmed vehicles, clothing, player options and waypoint teleport on the new version before ELF conversion.

The independent Windows app preserves that PC allocation and installation path, replacing the PS Neighborhood connection with a direct PS5Debug-NG adapter. Both resident image hashes remain identical to the original PC images. The independent installer successfully installed the menu in a fresh PPSA04264 session on 2026-10-01; live frame advancement was verified. The user then confirmed that the PC-installed menu was back to working perfectly, including the previously failing vehicle and clothing checks.

Automated checks cover exact executable profile selection, rejected firmware without writes, stale compare-and-write rejection, serialized memory operations, and both resident menu profiles. Nine automated checks passed, plus Electron UI checks for connection/install actions, error recovery, renderer isolation and window layout.

The experimental ELF displayed the menu but model streaming and clothing preview remained unreliable. Some cold models loaded while others timed out; the exact cause was not established. The user chose the PC delivery method instead. The ELF is not included in the Windows release.
