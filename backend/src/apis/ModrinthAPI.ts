import axios, { AxiosInstance } from "axios";

const MODRINTH_API = "https://api.modrinth.com/v2";

export class ModrinthAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: MODRINTH_API,
      timeout: 10000,
    });
  }

  async searchMods(query: string, minecraftVersion: string, modLoader: string) {
    try {
      const response = await this.client.get("/search", {
        params: {
          query,
          facets: JSON.stringify([
            ["project_type:mod"],
            [`versions:${minecraftVersion}`],
            [`categories:${modLoader}`],
          ]),
        },
      });

      return response.data.hits || [];
    } catch (error) {
      throw new Error(`Erro ao buscar mods no Modrinth: ${error}`);
    }
  }

  async getProjectById(projectId: string) {
    try {
      const response = await this.client.get(`/project/${projectId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao buscar projeto no Modrinth: ${error}`);
    }
  }

  async getVersions(
    projectId: string,
    minecraftVersion: string,
    modLoader: string
  ) {
    try {
      const response = await this.client.get(`/project/${projectId}/version`, {
        params: {
          loaders: JSON.stringify([modLoader]),
          game_versions: JSON.stringify([minecraftVersion]),
        },
      });

      return response.data || [];
    } catch (error) {
      throw new Error(`Erro ao buscar versões no Modrinth: ${error}`);
    }
  }

  async downloadFile(url: string) {
    try {
      const response = await this.client.get(url, {
        responseType: "stream",
      });
      return response.data;
    } catch (error) {
      throw new Error(`Erro ao baixar arquivo do Modrinth: ${error}`);
    }
  }
}
