import type { FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fp from "fastify-plugin";

export const corsPlugin = fp(async function corsPlugin(
  app: FastifyInstance,
): Promise<void> {
  const origins = app.config.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(fastifyCors, {
    origin: origins.length === 1 ? origins[0] : origins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  });
});
