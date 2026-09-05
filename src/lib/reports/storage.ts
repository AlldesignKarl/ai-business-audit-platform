import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "@/lib/env";

export interface ReportStorageDriver {
  readonly name: string;
  save(filename: string, buffer: Buffer): Promise<{ filePath: string }>;
}

class LocalStorageDriver implements ReportStorageDriver {
  readonly name = "local";
  private readonly baseDir = path.join(process.cwd(), "reports-output");

  async save(filename: string, buffer: Buffer): Promise<{ filePath: string }> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const filePath = path.join(this.baseDir, filename);
    await fs.writeFile(filePath, buffer);
    return { filePath };
  }
}

class S3StorageDriver implements ReportStorageDriver {
  readonly name = "s3";

  async save(): Promise<{ filePath: string }> {
    throw new Error(
      "REPORTS_STORAGE_DRIVER=s3 requiere instalar y configurar @aws-sdk/client-s3 (no incluido en esta fase). " +
        "Cambia a REPORTS_STORAGE_DRIVER=local o implementa S3StorageDriver.save()."
    );
  }
}

export function resolveReportStorageDriver(): ReportStorageDriver {
  const env = getEnv();
  return env.REPORTS_STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
}
