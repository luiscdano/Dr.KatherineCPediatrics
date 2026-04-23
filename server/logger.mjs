import fs from "node:fs";
import path from "node:path";
import { createLogger, format, transports } from "winston";
import config from "./config.mjs";

const resolvedLogDir = path.resolve(process.cwd(), config.ops.logDir);
fs.mkdirSync(resolvedLogDir, { recursive: true });

const logger = createLogger({
  level: config.ops.logLevel,
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  defaultMeta: {
    service: "dr-katherine-api",
    environment: process.env.NODE_ENV || "development"
  },
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(resolvedLogDir, "api.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

export default logger;
