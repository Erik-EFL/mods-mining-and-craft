import { FC, useState } from "react";
import { LogViewer } from "../components/LogViewer";
import { UpdateProgress } from "../components/UpdateProgress";
import { useSocket } from "../hooks/useSocket";
import { useUpdate } from "../hooks/useUpdate";
import "../styles/Dashboard.css";

export const Dashboard: FC = () => {
  const { loading, stats, logs, error, startUpdate, reset } = useUpdate();
  const { connected, progress, stopUpdate, resetProgress } = useSocket();
  const [modsFolder, setModsFolder] = useState("");
  const [zipDownloading, setZipDownloading] = useState(false);

  const handleStartUpdate = async () => {
    if (!modsFolder.trim()) {
      alert("Por favor, insira o caminho da pasta de mods");
      return;
    }
    resetProgress();
    await startUpdate(modsFolder);
  };

  const handleStopUpdate = () => {
    if (confirm("Deseja realmente parar a atualização?")) {
      stopUpdate();
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return "Calculando...";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleDownloadZip = async () => {
    if (!stats?.zipFile) {
      alert("Nenhum arquivo ZIP disponível");
      return;
    }

    setZipDownloading(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/downloads/${stats.zipFile}`
      );
      if (!response.ok) throw new Error("Erro ao baixar arquivo");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = stats.zipFile;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Erro ao baixar: ${err}`);
    } finally {
      setZipDownloading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>ModsCraft</h1>
          <p>Gerenciador de Mods para Minecraft</p>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="control-section">
          <h2>Atualizar Mods</h2>
          <p className="section-description">
            Insira o caminho da pasta de mods e clique no botão para verificar e
            atualizar todos os seus mods para as versões mais recentes.
          </p>

          <div className="input-group">
            <input
              type="text"
              placeholder="Ex: C:\\Users\\username\\AppData\\Roaming\\.minecraft\\mods"
              value={modsFolder}
              onChange={(e) => setModsFolder(e.target.value)}
              disabled={loading}
              className="input-mods-folder"
            />
          </div>

          <div className="button-group">
            <button
              onClick={handleStartUpdate}
              disabled={loading || !modsFolder.trim()}
              className="btn btn-primary btn-lg"
            >
              {loading ? "Atualizando..." : "Iniciar Atualização"}
            </button>
            {loading && (
              <button
                onClick={handleStopUpdate}
                className="btn btn-danger btn-lg"
              >
                🛑 Parar
              </button>
            )}
            {stats && (
              <>
                <button
                  onClick={handleDownloadZip}
                  disabled={zipDownloading || !stats.zipFile}
                  className="btn btn-success"
                >
                  {zipDownloading ? "Baixando..." : "📦 Download ZIP"}
                </button>
                <button onClick={reset} className="btn btn-secondary">
                  Limpar Resultados
                </button>
              </>
            )}
          </div>

          {!connected && (
            <div className="warning-message">
              ⚠️ Desconectado do servidor. Reconectando...
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          {progress && loading && (
            <div className="progress-container">
              <div className="progress-info">
                <span className="progress-text">
                  {progress.current} / {progress.total} mods (
                  {progress.percentage}%)
                </span>
                <span className="progress-mod">
                  Verificando: {progress.currentMod}
                </span>
                {progress.estimatedTimeRemaining && (
                  <span className="progress-time">
                    Tempo estimado:{" "}
                    {formatTime(progress.estimatedTimeRemaining)}
                  </span>
                )}
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {stats && (
          <section className="results-section">
            <UpdateProgress stats={stats} isLoading={loading} />
          </section>
        )}

        {logs && logs.length > 0 && (
          <section className="logs-section">
            <h2>Detalhes da Atualização</h2>
            <LogViewer logs={logs} />
          </section>
        )}
      </main>
    </div>
  );
};
