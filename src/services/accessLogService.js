import api from "./api";

export const getRecentAccessLogs = async () => {
  const response = await api.get("/audit", {
    params: { skip: 0, limit: 10 }
  });
  return response.data;
};