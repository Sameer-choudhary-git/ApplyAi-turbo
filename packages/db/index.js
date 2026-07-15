import dotenv from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
// Load .env files with explicit paths for monorepo compatibility
// Try root .env first, then app-specific .env files
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../apps/worker/.env") });
dotenv.config({ path: path.resolve(__dirname, "../../apps/extractor/.env") });
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
export { prisma };
