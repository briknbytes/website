// Thin wrapper around the bits of the Discord API we need. No bot token
// required: we use the user's own OAuth access token (scope
// `guilds.members.read`) to check whether they belong to our guild.
const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordEnv {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_GUILD_ID: string;
  DISCORD_REDIRECT_URI: string;
}

export function buildAuthorizeUrl(env: DiscordEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds.members.read",
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(env: DiscordEnv, code: string): Promise<{ access_token: string } | null> {
  const body = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.DISCORD_REDIRECT_URI,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchDiscordUser(accessToken: string): Promise<{ id: string; username: string } | null> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// Returns true only if the authenticated user is a member of our guild.
// Uses /users/@me/guilds/{guild.id}/member, which requires the
// `guilds.members.read` scope on the user's token and returns 404 when
// they aren't a member (no bot token or server-side membership list needed).
export async function isGuildMember(env: DiscordEnv, accessToken: string): Promise<boolean> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds/${env.DISCORD_GUILD_ID}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.status === 200;
}
