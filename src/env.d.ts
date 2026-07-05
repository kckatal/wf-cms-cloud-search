/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    runtimeEnv?: Record<string, string | undefined>;
    runtime?: {
      env?: Record<string, string | undefined>;
    };
  }
}

export {};
