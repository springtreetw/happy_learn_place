// Build-time switch for the isolated pre-release test ledger.
// Pre-release default. Turn off before public release; a client-side flag is not anti-cheat.
window.SHIBA_BUILD_CONFIG = Object.freeze({ testMode: true });
