import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import FancyToggleSwitch from "@components/FancyToggleSwitch";
import HelpText from "@components/HelpText";
import InlineLink from "@components/InlineLink";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import { PeerGroupSelector } from "@components/PeerGroupSelector";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { Callout } from "@components/Callout";
import { useHasChanges } from "@hooks/useHasChanges";
import * as Tabs from "@radix-ui/react-tabs";
import { useApiCall } from "@utils/api";
import { cn, validator } from "@utils/helpers";
import {
  ClockFadingIcon,
  ExternalLinkIcon,
  FlaskConicalIcon,
  MonitorSmartphoneIcon,
  AlertTriangle,
  RefreshCcw,
  RotateCcwIcon,
  ZapIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import SettingsIcon from "@/assets/icons/SettingsIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Account } from "@/interfaces/Account";
import { SmallBadge } from "@components/ui/SmallBadge";
import ReverseProxyIcon from "@/assets/icons/ReverseProxyIcon";
import useGroupHelper from "@/modules/groups/useGroupHelper";
import { useGroups } from "@/contexts/GroupsProvider";
import { SkeletonSettings } from "@components/skeletons/SkeletonSettings";
import { parseDuration, formatDuration } from "@/modules/settings/duration";
import {
  ConnectionModeValue,
  DEFAULT_P2P_RETRY_MAX_SECONDS,
  DEFAULT_P2P_TIMEOUT_SECONDS,
  DEFAULT_RELAY_TIMEOUT_SECONDS,
  MODE_META,
  VISIBLE_MODE_OPTIONS,
  modeImpliesLegacyLazy,
  resolveLegacyLazyBool,
} from "@/modules/settings/connectionmode/modeOptions";

type Props = {
  account: Account;
};

const latestOrCustomVersion = [
  {
    label: "Disabled",
    value: "disabled",
  },
  {
    label: "Latest Version",
    value: "latest",
  },
  {
    label: "Custom Version",
    value: "custom",
  },
] as SelectOption[];

export default function ClientSettingsTab({ account }: Readonly<Props>) {
  const { isLoading: isGroupsLoading } = useGroups();

  return isGroupsLoading ? (
    <SkeletonSettings />
  ) : (
    <ClientSettingsTabContent account={account} />
  );
}

function ClientSettingsTabContent({ account }: Readonly<Props>) {
  const { permission } = usePermissions();

  const { mutate } = useSWRConfig();
  const saveRequest = useApiCall<Account>("/accounts/" + account.id, true);

  // Phase 1 of issue #5989: replaced the binary lazy-toggle with a
  // 2-value dropdown (p2p / p2p-lazy). The dashboard preserves the legacy
  // lazy_connection_enabled boolean alongside the new connection_mode for
  // backwards-compat with older daemon versions.
  const [connectionMode, setConnectionMode] = useState<ConnectionModeValue>(
    (account.settings?.connection_mode as ConnectionModeValue | null | undefined) ??
      resolveLegacyLazyBool(account.settings?.lazy_connection_enabled),
  );
  const [relayTimeoutSeconds, setRelayTimeoutSeconds] = useState<number | null>(
    account.settings?.relay_timeout_seconds ?? null,
  );
  const [p2pTimeoutSeconds, setP2pTimeoutSeconds] = useState<number | null>(
    account.settings?.p2p_timeout_seconds ?? null,
  );
  const [p2pRetryMaxSeconds, setP2pRetryMaxSeconds] = useState<number | null>(
    account.settings?.p2p_retry_max_seconds ?? null,
  );

  // Local string state for the three timeout inputs (supports "1h30m" syntax).
  // Parsed + saved on blur; typed text is never discarded mid-keystroke.
  const [relayTimeoutInput, setRelayTimeoutInput] = useState<string>(
    account.settings?.relay_timeout_seconds != null
      ? formatDuration(account.settings.relay_timeout_seconds)
      : "",
  );
  const [p2pTimeoutInput, setP2pTimeoutInput] = useState<string>(
    account.settings?.p2p_timeout_seconds != null
      ? formatDuration(account.settings.p2p_timeout_seconds)
      : "",
  );
  const [p2pRetryMaxInput, setP2pRetryMaxInput] = useState<string>(
    account.settings?.p2p_retry_max_seconds != null
      ? formatDuration(account.settings.p2p_retry_max_seconds)
      : "",
  );
  const [relayTimeoutError, setRelayTimeoutError] = useState<string | null>(null);
  const [p2pTimeoutError, setP2pTimeoutError] = useState<string | null>(null);
  const [p2pRetryMaxError, setP2pRetryMaxError] = useState<string | null>(null);

  const autoUpdateSetting = account.settings?.auto_update_version;
  const isAutoUpdateEnabled =
    !!autoUpdateSetting && autoUpdateSetting !== "disabled";
  const isCustomVersion = validator.isValidVersion(autoUpdateSetting);
  const [autoUpdateMethod, setAutoUpdateMethod] = useState(
    isAutoUpdateEnabled ? (isCustomVersion ? "custom" : "latest") : "disabled",
  );

  const [autoUpdateCustomVersion, setAutoUpdateCustomVersion] = useState(
    isCustomVersion ? autoUpdateSetting : "",
  );

  const [autoUpdateAlways, setAutoUpdateAlways] = useState(
    account.settings?.auto_update_always ?? false,
  );

  const [peerExposeEnabled, setPeerExposeEnabled] = useState<boolean>(
    account?.settings?.peer_expose_enabled ?? false,
  );
  const [peerExposeGroups, setPeerExposeGroups, { save: saveGroups }] =
    useGroupHelper({
      initial: account.settings?.peer_expose_groups,
    });
  const peerExposeGroupNames = useMemo(
    () => peerExposeGroups.map((g) => g.name).sort(),
    [peerExposeGroups],
  );

  const { hasChanges, updateRef } = useHasChanges([
    autoUpdateMethod,
    autoUpdateCustomVersion,
    autoUpdateAlways,
    peerExposeEnabled,
    peerExposeGroupNames,
  ]);

  const handleUpdateMethodChange = (value: string) => {
    setAutoUpdateMethod(value);
    if (value === "disabled" || value === "latest") {
      setAutoUpdateCustomVersion("");
    }
  };

  const versionError = useMemo(() => {
    const msg = "Please enter a valid version, e.g., 0.2, 0.2.0, 0.2.0-alpha.1";
    if (autoUpdateCustomVersion == "") return "";
    if (autoUpdateCustomVersion == "-") return "";
    const validSemver = validator.isValidVersion(autoUpdateCustomVersion);
    if (!validSemver) return msg;
    return "";
  }, [autoUpdateCustomVersion]);

  const canSaveCustomVersion =
    autoUpdateCustomVersion !== "" &&
    autoUpdateMethod === "custom" &&
    versionError === "";

  const isSaveButtonDisabled = useMemo(() => {
    return (
      !hasChanges ||
      !permission.settings.update ||
      (autoUpdateMethod === "custom" && !canSaveCustomVersion) ||
      (peerExposeEnabled && peerExposeGroups.length === 0)
    );
  }, [
    hasChanges,
    permission.settings.update,
    autoUpdateMethod,
    canSaveCustomVersion,
    peerExposeEnabled,
    peerExposeGroups,
  ]);

  const saveChanges = async () => {
    const groups = await saveGroups();
    const peerExposeGroupIds = groups
      .map((group) => group.id)
      .filter(Boolean) as string[];

    notify({
      title: "Client Settings",
      description: `Client settings successfully updated.`,
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            auto_update_version: autoUpdateCustomVersion || autoUpdateMethod,
            auto_update_always: autoUpdateAlways,
            peer_expose_enabled: peerExposeEnabled,
            peer_expose_groups: peerExposeGroupIds,
          },
        })
        .then(() => {
          mutate("/accounts");
          updateRef([
            autoUpdateMethod,
            autoUpdateCustomVersion,
            autoUpdateAlways,
            peerExposeEnabled,
            peerExposeGroupNames,
          ]);
        }),
      loadingMessage: "Updating client settings...",
    });
  };

  // Phase 1 (#5989): persist mode + timeout, AND mirror onto the legacy
  // lazy_connection_enabled boolean so older daemon versions stay in sync.
  // Phase 2: extends with p2p_timeout_seconds.
  // Phase 3: extends with p2p_retry_max_seconds.
  const saveConnectionMode = async (
    nextMode: ConnectionModeValue,
    nextRelayTimeout: number | null,
    nextP2pTimeout: number | null,
    nextP2pRetryMax: number | null,
  ) => {
    setConnectionMode(nextMode);
    setRelayTimeoutSeconds(nextRelayTimeout);
    setP2pTimeoutSeconds(nextP2pTimeout);
    setP2pRetryMaxSeconds(nextP2pRetryMax);

    notify({
      title: "Connection Mode",
      description: "Connection mode updated.",
      promise: saveRequest
        .put({
          id: account.id,
          settings: {
            ...account.settings,
            connection_mode: nextMode,
            relay_timeout_seconds: nextRelayTimeout,
            p2p_timeout_seconds: nextP2pTimeout,
            p2p_retry_max_seconds: nextP2pRetryMax,
            lazy_connection_enabled: modeImpliesLegacyLazy(nextMode),
          },
        })
        .then(() => mutate("/accounts")),
      loadingMessage: "Updating connection mode...",
    });
  };

  const handleModeChange = (next: string) => {
    // Mode-change preserves all three persisted timeouts (per spec
    // section 5.3): users only lose entered values if they clear
    // the input explicitly, not via mode-switch.
    saveConnectionMode(next as ConnectionModeValue, relayTimeoutSeconds, p2pTimeoutSeconds, p2pRetryMaxSeconds);
  };

  const handleBlurRelay = () => {
    if (relayTimeoutInput === "") {
      setRelayTimeoutError(null);
      saveConnectionMode(connectionMode, null, p2pTimeoutSeconds, p2pRetryMaxSeconds);
      return;
    }
    const parsed = parseDuration(relayTimeoutInput);
    if (parsed === null) {
      setRelayTimeoutError(`Invalid format. Use "1m", "5m30s", "0s", or seconds.`);
      return;
    }
    setRelayTimeoutError(null);
    saveConnectionMode(connectionMode, parsed, p2pTimeoutSeconds, p2pRetryMaxSeconds);
  };

  const handleBlurP2p = () => {
    if (p2pTimeoutInput === "") {
      setP2pTimeoutError(null);
      saveConnectionMode(connectionMode, relayTimeoutSeconds, null, p2pRetryMaxSeconds);
      return;
    }
    const parsed = parseDuration(p2pTimeoutInput);
    if (parsed === null) {
      setP2pTimeoutError(`Invalid format. Use "1m", "5m30s", "0s", or seconds.`);
      return;
    }
    setP2pTimeoutError(null);
    saveConnectionMode(connectionMode, relayTimeoutSeconds, parsed, p2pRetryMaxSeconds);
  };

  const handleBlurP2pRetryMax = () => {
    if (p2pRetryMaxInput === "") {
      setP2pRetryMaxError(null);
      saveConnectionMode(connectionMode, relayTimeoutSeconds, p2pTimeoutSeconds, null);
      return;
    }
    const parsed = parseDuration(p2pRetryMaxInput);
    if (parsed === null) {
      setP2pRetryMaxError(`Invalid format. Use "1m", "5m30s", "2h", or "0s".`);
      return;
    }
    setP2pRetryMaxError(null);
    saveConnectionMode(connectionMode, relayTimeoutSeconds, p2pTimeoutSeconds, parsed);
  };

  const currentMeta = MODE_META[connectionMode];

  return (
    <Tabs.Content value={"clients"}>
      <div className={"p-default py-6 max-w-2xl"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/settings"}
            label={"Settings"}
            icon={<SettingsIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/settings?tab=clients"}
            label={"Clients"}
            icon={<MonitorSmartphoneIcon size={14} />}
            active
          />
        </Breadcrumbs>
        <div className={"flex items-start justify-between"}>
          <h1>Clients</h1>
          <Button
            variant={"primary"}
            disabled={isSaveButtonDisabled}
            onClick={saveChanges}
            data-cy={"save-clients-settings"}
          >
            Save Changes
          </Button>
        </div>

        <div className={"flex flex-col gap-10 w-full mt-8"}>
          <div className={"flex flex-col relative"}>
            <Label>
              <RefreshCcw size={15} />
              Automatic Updates
              <SmallBadge
                text={"Beta"}
                variant={"sky"}
                className={"text-[9px] leading-none py-[3px] px-[5px]"}
                textClassName={"top-0"}
              />
            </Label>
            <HelpText>
              Configure how NetBird clients receive update notifications.
              When enabled, users will be prompted to install the selected
              version. This requires at least NetBird{" "}
              <span className={"text-white font-medium"}>v0.61.0</span>.{" "}
              <InlineLink
                href={"https://docs.netbird.io/manage/peers/auto-update"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </HelpText>
            <div className={"gap-4 items-center grid grid-cols-2"}>
              <SelectDropdown
                value={autoUpdateMethod}
                onChange={handleUpdateMethodChange}
                options={latestOrCustomVersion}
              />
              <Input
                value={autoUpdateCustomVersion}
                customPrefix={"Version"}
                placeholder={"e.g., 0.52.2"}
                error={versionError}
                errorTooltip={true}
                disabled={autoUpdateMethod !== "custom"}
                onChange={(v) => {
                  setAutoUpdateCustomVersion(v.target.value);
                }}
              />
            </div>
            <FancyToggleSwitch
              className={"mt-4"}
              value={autoUpdateAlways}
              onChange={setAutoUpdateAlways}
              label={
                <>
                  <AlertTriangle size={15} className={"text-yellow-400"} />
                  Force Automatic Updates
                </>
              }
              helpText={
                "When enabled, updates are installed automatically in the background without user interaction."
              }
              disabled={
                !permission.settings.update || autoUpdateMethod === "disabled"
              }
            />
            {autoUpdateAlways && autoUpdateMethod !== "disabled" && (
              <Callout
                className={"mt-3"}
                variant={"warning"}
                icon={
                  <AlertTriangle
                    size={14}
                    className={"shrink-0 relative top-[3px]"}
                  />
                }
              >
                Enabling automatic updates will restart the NetBird client
                during updates, which can temporarily disrupt active
                connections. Use with caution in production environments.
              </Callout>
            )}
          </div>

          <div>
            <div>
              <Label>
                <ReverseProxyIcon size={15} className={"fill-nb-gray-300"} />
                Expose Services from CLI
              </Label>
              <HelpText>
                Allow peers to expose local services through the NetBird reverse
                proxy using the CLI. <br /> This requires at least NetBird{" "}
                <span className={"text-white font-medium"}>v0.66.0</span>.{" "}
                <InlineLink
                  href={
                    "https://docs.netbird.io/manage/reverse-proxy/expose-from-cli"
                  }
                  target={"_blank"}
                >
                  Learn more
                  <ExternalLinkIcon size={12} />
                </InlineLink>
              </HelpText>
            </div>

            <FancyToggleSwitch
              className={"mt-2"}
              value={peerExposeEnabled}
              onChange={setPeerExposeEnabled}
              label={"Enable Peer Expose"}
              helpText={
                "When enabled, peers can expose local HTTP services accessible via a public URL."
              }
              disabled={!permission.settings.update}
            />

            <div
              className={cn(
                "border border-nb-gray-900 border-t-0 rounded-b-md bg-nb-gray-940 px-[1.28rem] pt-3 pb-5 flex flex-col gap-4 mx-[0.25rem]",
                !peerExposeEnabled
                  ? "opacity-50 pointer-events-none"
                  : "bg-nb-gray-930/80",
              )}
            >
              <div className={"mt-2"}>
                <Label>Allowed peer groups</Label>
                <HelpText>
                  Select which peer groups are allowed to expose services. At
                  least one group is required.
                </HelpText>
                <PeerGroupSelector
                  values={peerExposeGroups}
                  onChange={setPeerExposeGroups}
                  placeholder="Select peer groups..."
                />
              </div>
            </div>
          </div>

          <div>
            <Label>
              <FlaskConicalIcon size={15} />
              Experimental: Connection Mode
            </Label>

            <HelpText>
              Choose how NetBird clients establish peer-to-peer connections.{" "}
              <span className={"text-white font-medium"}>P2P</span> keeps
              connections always on (best latency, more bandwidth).{" "}
              <span className={"text-white font-medium"}>P2P Lazy</span>{" "}
              opens connections on demand and tears them down after the relay
              timeout (much lower bandwidth on metered links like LTE).
              Changes take effect after the client restarts.{" "}
              <InlineLink
                href={"https://docs.netbird.io/how-to/lazy-connection"}
                target={"_blank"}
              >
                Learn more
                <ExternalLinkIcon size={12} />
              </InlineLink>
            </HelpText>
            <div className={"mt-2"}>
              <SelectDropdown
                value={connectionMode}
                onChange={handleModeChange}
                options={VISIBLE_MODE_OPTIONS}
              />
            </div>
            {currentMeta.showsRelayTimeout && (
              <div className={"mt-3"}>
                <Input
                  value={relayTimeoutInput}
                  customPrefix={<ClockFadingIcon size={14} />}
                  placeholder={`default: ${formatDuration(DEFAULT_RELAY_TIMEOUT_SECONDS)}`}
                  onChange={(e) => setRelayTimeoutInput(e.target.value)}
                  onBlur={handleBlurRelay}
                  error={relayTimeoutError ?? undefined}
                  disabled={!permission.settings.update}
                />
                <HelpText className={"mt-2"}>
                  Relay timeout. Format: "1m", "5m30s", "0s" (no teardown).
                  Default: <strong>{formatDuration(DEFAULT_RELAY_TIMEOUT_SECONDS)}</strong>.
                </HelpText>
              </div>
            )}
            {currentMeta.showsP2pTimeout && (
              <div className={"mt-3"}>
                <Input
                  value={p2pTimeoutInput}
                  customPrefix={<ZapIcon size={14} />}
                  placeholder={`default: ${formatDuration(DEFAULT_P2P_TIMEOUT_SECONDS)}`}
                  onChange={(e) => setP2pTimeoutInput(e.target.value)}
                  onBlur={handleBlurP2p}
                  error={p2pTimeoutError ?? undefined}
                  disabled={!permission.settings.update}
                />
                <HelpText className={"mt-2"}>
                  P2P (ICE) timeout. Format: "1m", "5m30s", "0s" (no teardown).
                  Default: <strong>{formatDuration(DEFAULT_P2P_TIMEOUT_SECONDS)}</strong>.
                </HelpText>
              </div>
            )}
            {currentMeta.showsP2pRetryMax && (
              <div className={"mt-3"}>
                <Input
                  value={p2pRetryMaxInput}
                  customPrefix={<RotateCcwIcon size={14} />}
                  placeholder={`default: ${formatDuration(DEFAULT_P2P_RETRY_MAX_SECONDS)}`}
                  onChange={(e) => setP2pRetryMaxInput(e.target.value)}
                  onBlur={handleBlurP2pRetryMax}
                  error={p2pRetryMaxError ?? undefined}
                  disabled={!permission.settings.update}
                />
                <HelpText className={"mt-2"}>
                  Max P2P-retry interval after ICE failures. Format: "1m", "5m30s", "2h", "0s" (no backoff).
                  Default: <strong>{formatDuration(DEFAULT_P2P_RETRY_MAX_SECONDS)}</strong>.
                </HelpText>
              </div>
            )}
          </div>
        </div>
      </div>
    </Tabs.Content>
  );
}
