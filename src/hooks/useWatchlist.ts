import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, apiFetch } from "@/services/api";

const STORAGE_KEY = "sd.watchlist";

function readLocalWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalWatchlist(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore storage limits in private mode */
  }
}

export function useWatchlist() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [localIds, setLocalIds] = useState<string[]>(() => readLocalWatchlist());
  const [serverIds, setServerIds] = useState<string[]>(() => user?.followedProjectIds ?? []);

  useEffect(() => {
    setServerIds(user?.followedProjectIds ?? []);
  }, [user?.followedProjectIds]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLocalIds(readLocalWatchlist());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const ids = user ? serverIds : localIds;

  const isFollowed = useCallback((projectId: string) => ids.includes(projectId), [ids]);

  const toggle = useCallback(
    async (projectId: string) => {
      const currentlyFollowed = ids.includes(projectId);
      if (user) {
        const optimistic = currentlyFollowed
          ? serverIds.filter((id) => id !== projectId)
          : [projectId, ...serverIds];
        setServerIds(optimistic);
        try {
          const res = await apiFetch<{ followedProjectIds: string[] }>(
            `/projects/${projectId}/follow`,
            { method: currentlyFollowed ? "DELETE" : "POST" },
          );
          setServerIds(res.followedProjectIds);
          void refresh();
          toast.push(currentlyFollowed ? "Removed from saved projects" : "Project saved", {
            tone: "info",
          });
        } catch (err) {
          setServerIds(user.followedProjectIds ?? []);
          toast.push("Could not update saved projects", {
            description: err instanceof ApiError ? err.message : undefined,
            tone: "error",
          });
        }
        return;
      }

      const next = currentlyFollowed
        ? localIds.filter((id) => id !== projectId)
        : [projectId, ...localIds].slice(0, 200);
      setLocalIds(next);
      writeLocalWatchlist(next);
      toast.push(currentlyFollowed ? "Removed from saved projects" : "Project saved locally", {
        description: currentlyFollowed ? undefined : "Sign in to sync saved projects across sessions.",
        tone: "info",
      });
    },
    [ids, localIds, refresh, serverIds, toast, user],
  );

  return { ids, count: ids.length, isFollowed, toggle };
}
