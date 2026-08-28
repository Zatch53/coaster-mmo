export const API_URL = import.meta.env.VITE_API_URL ?? "";

export async function resetPark() {
  const res = await fetch(`${API_URL}/api/reset`, { method: "POST" });
  if (!res.ok) throw new Error("reset failed");
}
