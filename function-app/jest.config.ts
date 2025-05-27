import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  setupFiles: ["<rootDir>/test/setEnvVars.js"],
  testEnvironment: "node",
  resetMocks: true,
  testRegex: "test/.*\\.test\\.ts$",
  verbose: true,
};

export default config;
