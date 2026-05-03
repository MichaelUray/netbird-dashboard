// Phase 3 (issue #5989) connection-mode options for the dashboard.
// All four modes exposed; ordered relay-forced -> p2p -> p2p-lazy -> p2p-dynamic
// (most-restrictive to most-elastic) so the picker reads top-down from
// "force relay always" to "smart elastic".

import { SelectOption } from "@components/select/SelectDropdown";

export type ConnectionModeValue =
  | "relay-forced"
  | "p2p"
  | "p2p-lazy"
  | "p2p-dynamic";

export interface ModeMeta {
  value: ConnectionModeValue;
  label: string;
  visible: boolean;
  showsRelayTimeout: boolean;
  showsP2pTimeout: boolean;
  showsP2pRetryMax: boolean;
}

export const MODE_META: Record<ConnectionModeValue, ModeMeta> = {
  "relay-forced": {
    value: "relay-forced",
    label: "Relay Forced",
    visible: true,
    showsRelayTimeout: false,
    showsP2pTimeout: false,
    showsP2pRetryMax: false,
  },
  "p2p": {
    value: "p2p",
    label: "P2P (recommended)",
    visible: true,
    showsRelayTimeout: false,
    showsP2pTimeout: false,
    showsP2pRetryMax: false,
  },
  "p2p-lazy": {
    value: "p2p-lazy",
    label: "P2P Lazy",
    visible: true,
    showsRelayTimeout: true,
    showsP2pTimeout: false,
    showsP2pRetryMax: false,
  },
  "p2p-dynamic": {
    value: "p2p-dynamic",
    label: "P2P Dynamic",
    visible: true,
    showsRelayTimeout: true,
    showsP2pTimeout: true,
    showsP2pRetryMax: true,
  },
};

export const VISIBLE_MODE_OPTIONS: SelectOption[] = Object.values(MODE_META)
  .filter((m) => m.visible)
  .map((m) => ({ label: m.label, value: m.value }));

// Defaults shown as placeholders when DB value is NULL. Matched to the
// daemon-side defaults so the placeholder accurately previews what an
// unconfigured (NULL) peer will use. Changed 2026-05-03 from 5 min to
// 24 h on the relay side: 5 min was too aggressive for typical mesh
// usage (peers got torn down within minutes of an idle window, then
// had to re-handshake on the next packet), and the dashboard
// placeholder now mirrors what the daemon default is.
export const DEFAULT_RELAY_TIMEOUT_SECONDS = 24 * 60 * 60; // 24 h
export const DEFAULT_P2P_TIMEOUT_SECONDS = 180 * 60; // 180 min
export const DEFAULT_P2P_RETRY_MAX_SECONDS = 15 * 60; // 15 min

// resolveLegacyLazyBool mirrors the server-side fallback: if the new
// connection_mode field is null/undefined, derive the effective mode from
// the legacy lazy_connection_enabled boolean. Used to seed the dropdown
// state when a user opens an account that has never set the new field.
export function resolveLegacyLazyBool(
  lazyEnabled: boolean | undefined,
): ConnectionModeValue {
  return lazyEnabled ? "p2p-lazy" : "p2p";
}

// modeImpliesLegacyLazy is the inverse: when the user picks a mode in the
// dashboard, we ALSO write the legacy lazy_connection_enabled boolean to
// keep older daemon versions (which only understand the boolean) in sync.
// relay-forced and p2p-dynamic both map to false because the legacy boolean
// cannot express their semantics.
export function modeImpliesLegacyLazy(mode: ConnectionModeValue): boolean {
  return mode === "p2p-lazy";
}
