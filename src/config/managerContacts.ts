function normAt(u: string): string {
  const s = String(u || "").trim();
  return s ? (s.startsWith("@") ? s : `@${s}`) : "";
}

export const MANAGER_CONTACTS: Record<string, string> = {
  hamburg: "@manager_hamburg",
  frankfurt: "@manager_frankfurt",
  munich: "@manager_munich",
  mannheim: "@manager_mannheim",
  wiesbaden: "@manager_wiesbaden",
  berlin: "@manager_berlin",
};

export function getManagerContact(cityCode: string): string {
  const code = String(cityCode || "").toLowerCase();
  const envKey = `MANAGER_USERNAME_${code.toUpperCase()}`;
  const fromEnv = process.env[envKey] || process.env.MANAGER_USERNAME || "";
  const byEnv = normAt(fromEnv);
  if (byEnv) return byEnv;
  return MANAGER_CONTACTS[code] || "@shop_support";
}

export function getManagerUsernameForClient(
  cityCode: string,
  configManagerUsername?: string,
): string {
  const fromConfig = String(configManagerUsername || "").trim();
  if (fromConfig) return fromConfig.replace(/^@/, "");
  const code = String(cityCode || "").toLowerCase();
  const envKey = `VITE_MANAGER_USERNAME_${code.toUpperCase()}`;
  const fromEnv = String(
    (import.meta.env as Record<string, string | undefined>)[envKey] ||
      import.meta.env.VITE_MANAGER_USERNAME ||
      "",
  ).trim();
  if (fromEnv) return fromEnv.replace(/^@/, "");
  const fallback = MANAGER_CONTACTS[code] || "@shop_support";
  return fallback.replace(/^@/, "");
}
