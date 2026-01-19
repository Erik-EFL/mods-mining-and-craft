import { FC } from "react";
import "../styles/UpdateProgress.css";
import { UpdateStats } from "../types";

interface UpdateProgressProps {
  stats: UpdateStats;
  isLoading: boolean;
}

export const UpdateProgress: FC<UpdateProgressProps> = ({
  stats,
  isLoading,
}) => {
  const total = stats.checked;
  const percentage = total > 0 ? (total / total) * 100 : 0;

  return (
    <div className="update-progress">
      <div className="progress-header">
        <h3>Progresso da Atualização</h3>
      </div>

      <div className="progress-stats">
        <div className="stat-item stat-checked">
          <span className="stat-label">VERIFICADOS</span>
          <span className="stat-value">{stats.checked}</span>
        </div>
        <div className="stat-item stat-updated">
          <span className="stat-label">ATUALIZADOS</span>
          <span className="stat-value">{stats.updated}</span>
        </div>
        <div className="stat-item stat-uptodate">
          <span className="stat-label">JÁ ATUALIZADOS</span>
          <span className="stat-value">{stats.upToDate}</span>
        </div>
        <div className="stat-item stat-failed">
          <span className="stat-label">FALHAS</span>
          <span className="stat-value">{stats.failed}</span>
        </div>
      </div>

      <div className="progress-bar-wrapper">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="progress-percentage">{percentage.toFixed(1)}% completo</p>
      </div>
    </div>
  );
};
