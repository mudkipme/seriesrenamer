import { buildApp } from "./app.js";
import { readEnv } from "./config/env.js";

const env = readEnv();
const app = await buildApp();

await app.listen({
  host: "0.0.0.0",
  port: env.PORT,
});
