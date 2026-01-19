import { FC, useMemo, useState } from "react";
import "../styles/LogViewer.css";
import { UpdateLog } from "../types";

interface LogViewerProps {
  logs: UpdateLog[];
  maxHeight?: string;
}

type TabType = "all" | "updated" | "upToDate" | "failed";

export const LogViewer: FC<LogViewerProps> = ({
  logs,
  maxHeight = "400px",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Filtrar logs por categoria
  const filteredLogs = useMemo(() => {
    if (activeTab === "all") return logs;
    return logs.filter((log) => log.status === activeTab);
  }, [logs, activeTab]);

  // Contar logs por categoria
  const counts = useMemo(() => {
    return {
      all: logs.length,
      updated: logs.filter((log) => log.status === "updated").length,
      upToDate: logs.filter((log) => log.status === "upToDate").length,
      failed: logs.filter((log) => log.status === "failed").length,
    };
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="log-viewer empty">
        <p>Nenhum log disponível</p>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      <div className="log-tabs">
        <button
          className={`tab-button ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          Todos ({counts.all})
        </button>
        <button
          className={`tab-button tab-updated ${
            activeTab === "updated" ? "active" : ""
          }`}
          onClick={() => setActiveTab("updated")}
        >
          ✓ Atualizados ({counts.updated})
        </button>
        <button
          className={`tab-button tab-uptodate ${
            activeTab === "upToDate" ? "active" : ""
          }`}
          onClick={() => setActiveTab("upToDate")}
        >
          ⊙ Já Atualizados ({counts.upToDate})
        </button>
        <button
          className={`tab-button tab-failed ${
            activeTab === "failed" ? "active" : ""
          }`}
          onClick={() => setActiveTab("failed")}
        >
          ✗ Erros ({counts.failed})
        </button>
      </div>

      <div className="log-content" style={{ maxHeight, overflowY: "auto" }}>
        {filteredLogs.length === 0 ? (
          <div className="empty-tab">
            <p>Nenhum mod nesta categoria</p>
          </div>
        ) : (
          <table className="log-table">
            <thead>
              <tr>
                <th>Mod</th>
                <th>Status</th>
                {activeTab !== "failed" && <th>Versão Anterior</th>}
                {activeTab !== "failed" && <th>Nova Versão</th>}
                {(activeTab === "failed" || activeTab === "all") && (
                  <th>Erro</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className={`log-row log-${log.status}`}>
                  <td className="mod-name">
                    {log.modName || "Nome não disponível"}
                  </td>
                  <td className="status">
                    <span className={`badge badge-${log.status}`}>
                      {log.status === "updated"
                        ? "✓ Atualizado"
                        : log.status === "upToDate"
                        ? "⊙ Já atualizado"
                        : "✗ Erro"}
                    </span>
                  </td>
                  {activeTab !== "failed" && <td>{log.oldVersion || "-"}</td>}
                  {activeTab !== "failed" && <td>{log.newVersion || "-"}</td>}
                  {(activeTab === "failed" || activeTab === "all") && (
                    <td className="error">{log.error || "-"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
