import axios, { AxiosInstance } from "axios";

const CURSEFORGE_API = "https://api.curseforge.com/v1";

export class CurseForgeAPI {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: CURSEFORGE_API,
      timeout: 10000,
      headers: {
        "x-api-key": apiKey,
      },
    });
  }

  async searchMods(query: string, minecraftVersion: string, modLoader: string) {
    try {
      const modLoaderType = modLoader === "fabric" ? 4 : 1;

      const response = await this.client.get("/mods/search", {
        params: {
          gameId: 432,
          classId: 6,
          searchFilter: query,
          gameVersion: minecraftVersion,
          modLoaderType,
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar mods no CurseForge: ${error}`);
    }
  }

  async getProjectById(projectId: number) {
    try {
      const response = await this.client.get(`/mods/${projectId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(`Erro ao buscar projeto no CurseForge: ${error}`);
    }
  }

  async getFiles(
    projectId: number,
    minecraftVersion: string,
    modLoader: string
  ) {
    try {
      const modLoaderType = modLoader === "fabric" ? 4 : 1;

      const response = await this.client.get(`/mods/${projectId}/files`, {
        params: {
          gameVersion: minecraftVersion,
          modLoaderType,
        },
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar arquivos no CurseForge: ${error}`);
    }
  }
}
