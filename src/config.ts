// Site-wide constants. Nothing secret here — OAuth client secret, guild ID
// checks, and session signing all live server-side in the Worker
// (worker/index.ts) + Cloudflare runtime variables.
export const SITE = {
  name: "Brik & Bytes",
  description: "A Tunisian community for infrastructure, DevOps, and Kubernetes practitioners.",
  discordInviteUrl: "https://discord.gg/nThBHyWfCu",
  githubUrl: "https://github.com/briknbytes",
  about:
    "Brik & Bytes brings together the people who build and run infrastructure in Tunisia — DevOps engineers, SREs, platform engineers, and anyone curious about Kubernetes and cloud native systems. We swap notes on Discord, and host talks and hands-on sessions from the community, for the community.",
  stats: {
    members: "100+",
    eventsHosted: 4,
  },
};

// Edit freely — shown as a pill grid on the homepage under "What we talk about".
export const TOPICS = [
  "Kubernetes",
  "Cloud Native",
  "DevOps & CI/CD",
  "Site Reliability & Observability",
  "Cloud Infrastructure",
  "Platform Engineering",
  "Security",
  "Open Source",
];
