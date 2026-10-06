# Fidelity frame-cap development

Scope: PS5 GTA V PPSA04264 01.010.002, Story Mode; measured on firmware 13.60.

The game's render loop reads its requested flip interval at `0x6257f9c`, checks
the applied interval, and updates presentation through its existing import call.
Fidelity uses 2; both Performance presets use 1. Only this aligned runtime word
is overridden. No executable hook, added sleep, FPS overlay hook, graphics preset
replacement, or saved setting change is needed.

The resident menu checks Fidelity mode, its normal interval, and the unmodified
runtime interval before enabling. The installer additionally fingerprints the
renderer instructions that read/apply the interval. Other game profiles cannot
enable the option. An unexpected third-party interval is preserved and disables
the override. The original 14-toggle mailbox seed layout is retained.

## Console measurement

On October 5, 2026 (Eastern time), a temporary debugger test measured the game's
render-loop counter: 29.9 FPS before, 52.2 FPS during a ten-second interval of 1,
and 29.8 FPS after restoring 2. Fidelity mode remained selected. SHA-256 of the
entire 4,608-byte graphics configuration region was identical before, during,
and after. The game renderer acknowledged the interval change itself.

This establishes that the cap can be raised while preserving Fidelity settings.
It is one scene on one console, not a claim of locked 60 FPS, long-session
stability, or testing across other firmware/game versions. The user subsequently tested the integrated menu toggle and confirmed it works
well on the same console/game profile. This is user-reported validation of the
menu interaction in addition to the measured debugger experiment.

## Local checks

Both menu profiles compile. Native resident-control tests and the Fidelity cap
tests pass, along with the six connection/profile tests. Cap tests cover refusal
outside Fidelity/Story Mode, restoration, preset changes, menu shutdown, and
preserving another owner's interval. Compiler-required executable profile
fingerprints remain in place.

Research consulted illusionyy/PS-Game-Patch's GrandTheftAutoV-Orbis.xml (illusion
and Jao). Those are PS4 patches and were not applied to this PS5 executable. The
PS5 interval was identified from the user's own executable and tested at runtime.
