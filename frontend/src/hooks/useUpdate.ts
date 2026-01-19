import { useCallback, useState } from "react";
import { apiClient } from "../services/api-client";
import { UpdateLog, UpdateStats } from "../types";

interface UpdateState {
  loading: boolean;
  stats: (UpdateStats & { zipFile?: string }) | null;
  logs: UpdateLog[] | null;
  error: string | null;
}

export function useUpdate() {
  const [state, setState] = useState<UpdateState>({
    loading: false,
    stats: null,
    logs: null,
    error: null,
  });

  const startUpdate = useCallback(async (modsFolder: string) => {
    setState({ loading: true, stats: null, logs: null, error: null });

    const response = await apiClient.startUpdate(modsFolder);

    if (response.success && response.data) {
      const { summary, updated, failed, zipFile } = response.data;

      const mapLog = (log: any): UpdateLog => ({
        modName: log.modName || log.filename || "Desconhecido",
        status:
          log.status === "success"
            ? "updated"
            : log.status === "skipped"
            ? "upToDate"
            : "failed",
        oldVersion: log.oldVersion,
        newVersion: log.newVersion,
        error: log.reason,
        timestamp: log.timestamp,
      });

      setState({
        loading: false,
        stats: {
          checked: summary.totalChecked,
          updated: summary.updated,
          upToDate: summary.upToDate,
          failed: summary.failed,
          zipFile,
        },
        logs: [...(updated || []).map(mapLog), ...(failed || []).map(mapLog)],
        error: null,
      });
    } else {
      setState({
        loading: false,
        stats: null,
        logs: null,
        error: response.error || response.message || "Erro desconhecido",
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, stats: null, logs: null, error: null });
  }, []);

  return { ...state, startUpdate, reset };
}
