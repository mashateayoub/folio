import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  chmod,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { projectSchema, type Project } from "@/features/projects/model";

export class CompileError extends Error {
  constructor(
    message: string,
    public log = "",
    public status = 422,
  ) {
    super(message);
  }
}

export function containerArguments(
  name: string,
  directory: string,
  rootFile: string,
  image: string,
) {
  return [
    "run",
    "--rm",
    "--name",
    name,
    "--network=none",
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--pids-limit=64",
    "--memory=512m",
    "--memory-swap=512m",
    "--cpus=1",
    "--ulimit",
    "fsize=16777216:16777216",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=32m",
    "--mount",
    process.env.COMPILER_BUILD_VOLUME
      ? "type=volume,src=" +
        process.env.COMPILER_BUILD_VOLUME +
        ",dst=/work,volume-subpath=" +
        basename(directory)
      : "type=bind,src=" + directory + ",dst=/work",
    image,
    rootFile,
  ];
}

function run(
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let timedOut = false;
    let logLimitExceeded = false;
    let outputBytes = 0;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    function collect(data: string) {
      if (logLimitExceeded) return;
      output += data;
      outputBytes += Buffer.byteLength(data);

      // Stop abusive output instead of silently discarding diagnostic history.
      if (outputBytes > 16_000_000) {
        logLimitExceeded = true;
        child.kill("SIGKILL");
      }
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(
        new CompileError(
          "Docker is unavailable. Start the compiler service on a Docker-enabled host.",
          e.message,
          503,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);

      if (logLimitExceeded)
        reject(
          new CompileError(
            "Compilation stopped because compiler output exceeded the 16 MB log limit.",
            output,
            422,
          ),
        );
      else if (timedOut)
        reject(
          new CompileError(
            "Compilation exceeded the 30-second limit.",
            output,
            408,
          ),
        );
      else resolve({ code, output });
    });
  });
}

export async function compileProject(
  input: Project,
): Promise<{ pdf: Buffer; log: string }> {
  const project = projectSchema.parse(input);

  const directory = await mkdtemp(
    join(process.env.COMPILER_BUILD_ROOT || tmpdir(), "folio-build-"),
  );

  const name = "folio-" + randomUUID();

  try {
    await chmod(directory, 0o755);
    await mkdir(join(directory, "output"), { mode: 0o777 });
    // chmod is explicit because umask can strip writable bits.
    await chmod(join(directory, "output"), 0o777);

    for (const file of project.files) {
      const destination = join(directory, file.path);
      await mkdir(dirname(destination), { recursive: true, mode: 0o755 });
      await writeFile(destination, file.content, { mode: 0o644 });
    }

    const result = await run(
      containerArguments(
        name,
        directory,
        project.rootFile,
        process.env.COMPILER_IMAGE || "folio-tex:local",
      ),
      30_000,
    );

    if (result.code !== 0) {
      const unavailable =
        /permission denied|Cannot connect|Unable to find image|pull access denied|docker: Error/i.test(
          result.output,
        );

      throw new CompileError(
        unavailable
          ? "Compiler container could not start. Check Docker access and build the compiler image."
          : "LaTeX could not compile. Check the log below.",
        result.output,
        unavailable ? 503 : 422,
      );
    }

    const pdf = await readFile(
      join(directory, "output", basename(project.rootFile, ".tex") + ".pdf"),
    );

    if (pdf.byteLength > 16_000_000)
      throw new CompileError("The compiled PDF exceeds the 16 MB limit.");

    return { pdf, log: result.output };
  } finally {
    // Remove the container even when the Docker client was terminated.
    await run(["rm", "-f", name], 5_000).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}
