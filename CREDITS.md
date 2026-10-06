# Credits

The resident GTA V Story Mode menu and desktop installer are maintained by **GronedWaffel**. The resident code originated in our PS Neighborhood development work; this project packages it as an independent Windows app.

- **John Törnblom and contributors:** [PS5 payload SDK](https://github.com/ps5-payload-dev/sdk), ELF/runtime and ptrace foundations. `vendor/libNineS/pt.c` and `pt.h` retain the original GPL-3.0-or-later notices and derive from the libNineS copy in [etaHEN](https://github.com/etaHEN/etaHEN). Our changes cover 13.60 credential/capability handling, verified writes, syscall stepping, local includes and bounded attach cleanup.
- **LightningMods and etaHEN contributors:** libNineS integration reference and test environment. etaHEN itself is not bundled. The SDK/libNineS files are retained for the experimental ELF source.
- **Pharaoh2k / OSR and PS5Debug-NG contributors**, building on CTN and SiSTR0: [PS5Debug-NG](https://github.com/Pharaoh2k/ps5debug-NG), development/debugging and private executable-allocation reference. The Windows installer requires PS5Debug-NG 1.3.2 on the console; the debugger payload is not bundled.
- [2much4u's PS4 GTA V Native Caller](https://github.com/2much4u/PS4-GTA-V-Native-Caller): native context/vector ABI reference. PS4 offsets are not reused.
- [alloc8or's native database](https://github.com/alloc8or/gta5-nativedb-data): native names, signatures and trophy documentation.
- [ZeddMOCO's 1.70 crossmap](https://github.com/ZeddMOCO/GTA-V-Crossmap-1.70), [TupoyeMenu/BigBaseV2-fix](https://github.com/TupoyeMenu/BigBaseV2-fix) and [Maestro-1337's 1.58 crossmap](https://github.com/Maestro-1337/GTA-V-1.58-Crossmap): hash translation references, checked against native registrations in the user's executables.
- [DurtyFree's GTA V data dumps](https://github.com/DurtyFree/gta-v-data-dumps): factual vehicle identifiers, labels and classes in the compact catalogue.
- **illusion and Jao:** [PS-Game-Patch](https://github.com/illusionyy/PS-Game-Patch), GTA V PS4 frame-cap research reference. Their PS4 patches were not applied; the PS5 Fidelity interval was traced and verified independently in the tested executable.
- [Cfx.re controller reference](https://docs.fivem.net/docs/game-references/controls/): controller indices.
- [YimMenu's decompiled-script research](https://github.com/YimMenu/GTA-V-Decompiled-Scripts) and [drunderscore's GTA research](https://github.com/drunderscore/GTA-Research): mission-flow research references. Game scripts and executables are not distributed.

Referenced projects retain their original authorship and licenses. Original project code is GPL-3.0-or-later; see [LICENSE](LICENSE). Build dependencies retain their own notices.
