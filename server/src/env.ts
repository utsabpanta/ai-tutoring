import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: resolve(fileURLToPath(import.meta.url), "../../../.env") });

const GradeBand = z.enum(["K-2", "3-5", "6-8", "9-12", "undergrad", "grad"]);
export type GradeBand = z.infer<typeof GradeBand>;

const EnvSchema = z.object({
  LLM_PROVIDER: z.enum(["ollama"]).default("ollama"),
  LLM_MODEL: z.string().default("qwen2.5:7b-instruct-q4_K_M"),
  MODERATION_MODEL: z.string().default("llama-guard3:1b"),
  OLLAMA_HOST: z.string().url().default("http://localhost:11434"),

  API_PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),

  DB_PATH: z.string().default("./data/tutor.db"),

  DEV_USER_ID: z.string().default("dev"),
  DEV_USER_GRADE_BAND: GradeBand.default("6-8"),
  DEV_USER_TIMEZONE: z.string().default("America/Los_Angeles"),

  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  GUARDRAIL_TIMEOUT_MS: z.coerce.number().int().positive().default(2_000),
});

export const env = EnvSchema.parse(process.env);
export const gradeBands = GradeBand.options;
