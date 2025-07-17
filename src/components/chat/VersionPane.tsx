import { useAtom, useAtomValue } from "jotai";
import { selectedAppIdAtom, selectedVersionIdAtom } from "@/atoms/appAtoms";
import { useVersions } from "@/hooks/useVersions";
import { formatDistanceToNow } from "date-fns";
import { Heart, RotateCcw, X } from "lucide-react";
import type { Version } from "@/ipc/ipc_types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCheckoutVersion } from "@/hooks/useCheckoutVersion";
import { useLoadApp } from "@/hooks/useLoadApp";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toggle } from "./ui/toggle";

interface VersionPaneProps {
  isVisible: boolean;
  onClose: () => void;
}

export function VersionPane({ isVisible, onClose }: VersionPaneProps) {
  const appId = useAtomValue(selectedAppIdAtom);
  const { refreshApp } = useLoadApp(appId);
  const {
    versions: liveVersions,
    refreshVersions,
    revertVersion,
    toggleLikeVersion,
  } = useVersions(appId);
  const [selectedVersionId, setSelectedVersionId] = useAtom(
    selectedVersionIdAtom,
  );
  const { checkoutVersion, isCheckingOutVersion } = useCheckoutVersion();
  const wasVisibleRef = useRef(false);
  const [cachedVersions, setCachedVersions] = useState<Version[]>([]);
  const [showLiked, setShowLiked] = useState(false);

  useEffect(() => {
    async function updatePaneState() {
      // When pane becomes visible after being closed
      if (isVisible && !wasVisibleRef.current) {
        if (appId) {
          await refreshVersions();
          setCachedVersions(liveVersions);
        }
      }

      // Reset when closing
      if (!isVisible && selectedVersionId) {
        setSelectedVersionId(null);
        if (appId) {
          await checkoutVersion({ appId, versionId: "main" });
        }
      }

      wasVisibleRef.current = isVisible;
    }
    updatePaneState();
  }, [
    isVisible,
    selectedVersionId,
    setSelectedVersionId,
    appId,
    checkoutVersion,
    refreshVersions,
    liveVersions,
  ]);

  // Initial load of cached versions when live versions become available
  useEffect(() => {
    if (isVisible && liveVersions.length > 0 && cachedVersions.length === 0) {
      setCachedVersions(liveVersions);
    }
  }, [isVisible, liveVersions, cachedVersions.length]);

  const versions = useMemo(() => {
    const sourceVersions =
      cachedVersions.length > 0 ? cachedVersions : liveVersions;
    if (showLiked) {
      return sourceVersions.filter((v) => v.liked);
    }
    return sourceVersions;
  }, [cachedVersions, liveVersions, showLiked]);

  if (!isVisible) {
    return null;
  }

  const handleVersionClick = async (versionOid: string) => {
    if (appId) {
      setSelectedVersionId(versionOid);
      try {
        await checkoutVersion({ appId, versionId: versionOid });
      } catch (error) {
        console.error("Could not checkout version, unselecting version", error);
        setSelectedVersionId(null);
      }
      await refreshApp();
    }
  };

  return (
    <div className="h-full border-t border-2 border-border w-full">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold pl-2">Version History</h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={showLiked}
                onPressedChange={setShowLiked}
                aria-label="Show liked versions"
              >
                <Heart
                  className={cn(showLiked && "fill-red-500 text-red-500")}
                  size={16}
                />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {showLiked ? "Show all versions" : "Show liked versions"}
            </TooltipContent>
          </Tooltip>
          <button
            onClick={onClose}
            className="p-1 hover:bg-(--background-lightest) rounded-md"
            aria-label="Close version pane"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100%-60px)]">
        {versions.length === 0 ? (
          <div className="p-4">
            {showLiked ? "No liked versions" : "No versions available"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {versions.map((version: Version, index) => (
              <div
                key={version.oid}
                className={cn(
                  "px-4 py-3 hover:bg-(--background-lightest) cursor-pointer group",
                  selectedVersionId === version.oid &&
                    "bg-(--background-lightest)",
                  isCheckingOutVersion &&
                    selectedVersionId === version.oid &&
                    "opacity-50 cursor-not-allowed",
                )}
                onClick={() => {
                  if (!isCheckingOutVersion) {
                    handleVersionClick(version.oid);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <span className="font-medium text-xs">
                      Version {versions.length - index}
                    </span>
                    <span className="text-xs opacity-90 ml-2">
                      {formatDistanceToNow(
                        new Date(version.timestamp * 1000),
                        {
                          addSuffix: true,
                        },
                      )}
                    </span>
                    {version.message && (
                      <p className="mt-1 text-sm pr-2">
                        {version.message.startsWith(
                          "Reverted all changes back to version ",
                        )
                          ? version.message.replace(
                              /Reverted all changes back to version ([a-f0-9]+)/,
                              (_, hash) => {
                                const targetIndex = versions.findIndex(
                                  (v) => v.oid === hash,
                                );
                                return targetIndex !== -1
                                  ? `Reverted all changes back to version ${
                                      versions.length - targetIndex
                                    }`
                                  : version.message;
                              },
                            )
                          : version.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await toggleLikeVersion({ oid: version.oid });
                          }}
                          className="p-1.5 rounded-full hover:bg-background-lightest transition-colors"
                          aria-label={
                            version.liked ? "Unlike version" : "Like version"
                          }
                        >
                          <Heart
                            size={16}
                            className={cn(
                              "transition-all",
                              version.liked
                                ? "fill-red-500 text-red-500"
                                : "text-gray-400 group-hover:text-gray-600",
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {version.liked ? "Unlike" : "Like"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSelectedVersionId(null);
                            await revertVersion({
                              versionId: version.oid,
                            });
                            onClose();
                          }}
                          className={cn(
                            "invisible flex items-center gap-1 px-2 py-0.5 text-sm font-medium bg-(--primary) text-(--primary-foreground) hover:bg-background-lightest rounded-md transition-colors",
                            selectedVersionId === version.oid && "visible",
                          )}
                          aria-label="Restore to this version"
                        >
                          <RotateCcw size={12} />
                          <span>Restore</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Restore to this version</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
