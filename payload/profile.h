// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <stdint.h>
#include <stddef.h>
struct Fingerprint {uint64_t address;size_t length;uint8_t hash[32];};
struct Profile {
 const char* title; const char* version;
 uint64_t playerRoot,networkFlag,registry,original;
 Fingerprint fingerprints[4];
 uint64_t frameNatives[16];
 const uint8_t* image;
 uint8_t imageHash[32];
};
