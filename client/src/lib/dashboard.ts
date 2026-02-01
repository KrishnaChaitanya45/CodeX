import { createClient } from "redis";
import { pgPool } from "@/lib/postgres";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export type DashboardItemStatus =
  | "Active"
  | "Idle"
  | "Archived"
  | "Completed";

export type DashboardItem = {
  id: string;
  title: string;
  desc?: string;
  lang?: string;
  language?: string;
  projectSlug?: string;
  labType: "project" | "playground";
  icon: string;
  status: DashboardItemStatus;
  progress?: number;
  updatedAt: number;
};

export type DashboardStats = {
  playgroundsUsed: number;
  playgroundsLimit: number;
  projectsUsed: number;
  projectsLimit: number;
};

export type DashboardData = {
  playgrounds: DashboardItem[];
  projects: DashboardItem[];
  stats: DashboardStats;
};

type RedisLabInstance = {
  LabID?: string;
  labId?: string;
  Status?: string;
  status?: string;
  LastUpdatedAt?: number;
  lastUpdatedAt?: number;
  CreatedAt?: number;
  createdAt?: number;
};

type LabRow = {
  id: string;
  status: string | null;
  language: string | null;
  active_checkpoint: number | null;
  last_updated_at: string | null;
  created_at: string | null;
  quest_id: string | null;
  quest_name: string | null;
  quest_slug: string | null;
  quest_description: string | null;
  tech_name: string | null;
};

const toEpochMs = (value: string | number | null | undefined) => {
  if (!value) return 0;
  if (typeof value === "number") {
    return value > 1e12 ? value : value * 1000;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getIconForLabel = (label?: string) => {
  const normalized = (label || "").toLowerCase();
  if (normalized.includes("react")) return "⚛️";
  if (normalized.includes("node")) return "🟢";
  if (normalized.includes("python")) return "🐍";
  if (normalized.includes("rust")) return "🦀";
  if (normalized.includes("go") || normalized.includes("golang")) return "🐹";
  if (normalized.includes("java")) return "☕";
  if (normalized.includes("typescript")) return "🟦";
  if (normalized.includes("javascript") || normalized.includes("js")) return "📜";
  return "💻";
};

const titleCase = (value?: string | null) => {
  if (!value) return "";
  return value
    .split(/\s|\-|_/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const resolveStatus = (
  lab: LabRow,
  redisEntry: RedisLabInstance | undefined,
  totalCheckpoints?: number
): DashboardItemStatus => {
  const activeCheckpoint = lab.active_checkpoint || 0;
  if (totalCheckpoints && activeCheckpoint >= totalCheckpoints) {
    return "Completed";
  }

  const redisStatus = (redisEntry?.status || redisEntry?.Status || "").toLowerCase();
  if (redisStatus === "active") return "Active";
  if (redisStatus === "booting" || redisStatus === "created") return "Idle";

  if ((lab.status || "").toLowerCase() === "ended") {
    return lab.quest_id ? "Archived" : "Archived";
  }

  return "Idle";
};

const resolveUpdatedAt = (lab: LabRow, redisEntry?: RedisLabInstance) => {
  const redisUpdated = toEpochMs(
    redisEntry?.lastUpdatedAt ?? redisEntry?.LastUpdatedAt
  );
  if (redisUpdated) return redisUpdated;
  const dbUpdated = toEpochMs(lab.last_updated_at);
  if (dbUpdated) return dbUpdated;
  return toEpochMs(lab.created_at);
};

const getLimits = (usedPlaygrounds: number, usedProjects: number) => {
  const playgroundLimit = Number.parseInt(
    process.env.MAX_FREE_PLAYGROUNDS || "",
    10
  );
  const projectLimit = Number.parseInt(
    process.env.MAX_FREE_PROJECTS || "",
    10
  );

  return {
    playgroundsLimit: Number.isFinite(playgroundLimit)
      ? playgroundLimit
      : usedPlaygrounds,
    projectsLimit: Number.isFinite(projectLimit) ? projectLimit : usedProjects,
  };
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  if (!userId) {
    return {
      playgrounds: [],
      projects: [],
      stats: {
        playgroundsUsed: 0,
        playgroundsLimit: 0,
        projectsUsed: 0,
        projectsLimit: 0,
      },
    };
  }

  const redisClient = createClient({ url: REDIS_URL });
  let redisLabMap: Record<string, RedisLabInstance> = {};

  try {
    await redisClient.connect();
    const redisEntries = await redisClient.hGetAll("lab_instances");
    redisLabMap = Object.entries(redisEntries).reduce((acc, [labId, raw]) => {
      try {
        acc[labId] = JSON.parse(raw) as RedisLabInstance;
      } catch {
        acc[labId] = {};
      }
      return acc;
    }, {} as Record<string, RedisLabInstance>);
  } catch (error) {
    console.error("Redis error:", error);
  } finally {
    try {
      await redisClient.destroy();
    } catch {
      // ignore
    }
  }

  const labResult = await pgPool.query<LabRow>(
    `
      SELECT
        labs.id,
        labs.status,
        labs.language,
        labs.active_checkpoint,
        labs.last_updated_at,
        labs.created_at,
        labs.quest_id,
        quests.name AS quest_name,
        quests.slug AS quest_slug,
        quests.description AS quest_description,
        technologies.name AS tech_name
      FROM labs
      LEFT JOIN quests ON labs.quest_id = quests.id
      LEFT JOIN technologies ON labs.technology_id = technologies.id
      WHERE labs.user_id = $1
      ORDER BY labs.last_updated_at DESC NULLS LAST, labs.created_at DESC
    `,
    [userId]
  );

  const questIds = labResult.rows
    .map((lab: any) => lab.quest_id)
    .filter((questId: string): questId is string => Boolean(questId));

  const checkpointsByQuest: Record<string, number> = {};
  if (questIds.length > 0) {
    const checkpointResult = await pgPool.query<{
      quest_id: string;
      total: number;
    }>(
      `
        SELECT quest_id, COUNT(*)::int AS total
        FROM checkpoints
        WHERE quest_id = ANY($1::uuid[])
        GROUP BY quest_id
      `,
      [questIds]
    );

    checkpointResult.rows.forEach((row: any) => {
      checkpointsByQuest[row.quest_id] = row.total;
    });
  }

  const projects: DashboardItem[] = [];
  const playgrounds: DashboardItem[] = [];

  for (const lab of labResult.rows) {
    const redisEntry = redisLabMap[lab.id];
    const totalCheckpoints = lab.quest_id
      ? checkpointsByQuest[lab.quest_id]
      : undefined;

    const updatedAt = resolveUpdatedAt(lab, redisEntry);
    const status = resolveStatus(lab, redisEntry, totalCheckpoints);

    const languageLabel = lab.language || lab.tech_name || "";
    const icon = getIconForLabel(lab.quest_name || languageLabel);

    if (lab.quest_id) {
      const progress = totalCheckpoints
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(((lab.active_checkpoint || 0) / totalCheckpoints) * 100)
            )
          )
        : undefined;

      projects.push({
        id: lab.id,
        title: lab.quest_name || "Untitled Project",
        desc: lab.quest_description || "",
        language: lab.language || lab.tech_name || undefined,
        projectSlug: lab.quest_slug || undefined,
        labType: "project",
        icon,
        status,
        progress,
        updatedAt,
      });
    } else {
      const title = `${titleCase(languageLabel || "Sandbox")} Playground`;
      playgrounds.push({
        id: lab.id,
        title,
        lang: titleCase(languageLabel || "Sandbox"),
        language: lab.language || lab.tech_name || undefined,
        labType: "playground",
        icon,
        status,
        updatedAt,
      });
    }
  }

  const limits = getLimits(playgrounds.length, projects.length);

  return {
    playgrounds,
    projects,
    stats: {
      playgroundsUsed: playgrounds.length,
      projectsUsed: projects.length,
      playgroundsLimit: limits.playgroundsLimit,
      projectsLimit: limits.projectsLimit,
    },
  };
}