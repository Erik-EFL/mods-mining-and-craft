import axios, { AxiosInstance } from "axios";
import { UpdateResponse } from "../types";

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL = "http://localhost:3001/api") {
    this.client = axios.create({
      baseURL,
      timeout: 600000,
    });
  }

  async startUpdate(modsFolder: string): Promise<UpdateResponse> {
    try {
      const response = await this.client.post<UpdateResponse>(
        "/updates/start",
        {
          modsFolder,
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Erro ao iniciar atualização:", error);
      return {
        success: false,
        error: error.message,
        message: "Falha ao iniciar atualização",
      };
    }
  }

  async getUpdateStatus() {
    try {
      const response = await this.client.get("/updates/status");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async downloadMods(filename: string): Promise<Blob> {
    try {
      const response = await this.client.get(`/downloads/${filename}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Erro ao baixar arquivo: ${error.message}`);
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get("/health");
      return response.data;
    } catch (error) {
      return { status: "error" };
    }
  }

  /**
   * Função auxiliar para baixar arquivo
   */
  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const apiClient = new ApiClient();
