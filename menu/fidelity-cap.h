#pragma once

// Only the renderer's requested flip interval is changed. The renderer applies
// it itself; graphics presets, saved settings and executable code stay intact.
typedef struct { unsigned enabled, original; } FidelityCap;
static int fidelity_cap_enable(FidelityCap *s, unsigned supported, unsigned story,
                               unsigned mode, unsigned normal, volatile unsigned *interval) {
    if (!supported || !story || mode != 1 || normal != 2 || *interval != 2) return 0;
    s->original = *interval;
    s->enabled = 1;
    *interval = 1;
    return 1;
}
static void fidelity_cap_stop(FidelityCap *s, unsigned mode, unsigned normal,
                              volatile unsigned *interval) {
    if (!s->enabled) return;
    // Preserve another mod's changes. A changed graphics mode owns its own cap.
    unsigned restore = mode == 1 ? s->original : normal;
    if (*interval == 1 && (restore == 1 || restore == 2)) *interval = restore;
    s->enabled = 0;
}
static void fidelity_cap_tick(FidelityCap *s, unsigned permitted, unsigned mode,
                              unsigned normal, volatile unsigned *interval) {
    if (!s->enabled) return;
    if (!permitted || mode != 1 || normal != 2) {
        fidelity_cap_stop(s, mode, normal, interval);
        return;
    }
    if (*interval == 2) *interval = 1;
    else if (*interval != 1) s->enabled = 0;
}
