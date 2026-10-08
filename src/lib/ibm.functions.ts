/**
 * Server-side IBM Quantum bridge. Tokens are read from server env only and never returned.
 * Hardware execution requires an external Qiskit service (IBM_QISKIT_SERVICE_URL) plus the
 * user's IBM token (IBM_QUANTUM_TOKEN). Without both, every call reports what is missing.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { buildJobRequest } from "./ibm/job";

export type IbmStatus = { tokenConfigured: boolean; serviceConfigured: boolean; missing: string[] };
export type IbmSubmitResult =
  { ok: true; jobId: string; status: string } | { ok: false; error: string; missing?: string[] };
export type IbmJobStatus =
  { ok: true; status: string; counts?: Record<string, number> } | { ok: false; error: string };

function config() {
  const token = process.env["IBM_QUANTUM_TOKEN"];
  const url = process.env["IBM_QISKIT_SERVICE_URL"];
  const missing: string[] = [];
  if (!token) missing.push("IBM_QUANTUM_TOKEN (your IBM Quantum API token)");
  if (!url) missing.push("IBM_QISKIT_SERVICE_URL (external Python/Qiskit service)");
  return { token, url: url?.replace(/\/+$/, ""), missing };
}

export const getIbmStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<IbmStatus> => {
    const { token, url, missing } = config();
    return { tokenConfigured: !!token, serviceConfigured: !!url, missing };
  },
);

const SubmitInput = z.object({
  circuit: z.unknown(),
  backend: z.string().max(64),
  shots: z.number(),
  confirmHardware: z.literal(true),
});

export const submitIbmJob = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitInput.parse(d))
  .handler(async ({ data }): Promise<IbmSubmitResult> => {
    const { token, url, missing } = config();
    if (missing.length)
      return { ok: false, error: "IBM Quantum execution is not configured.", missing };
    const built = buildJobRequest({
      circuit: data.circuit,
      backend: data.backend,
      shots: data.shots,
    }); // re-validate on the server
    if (!built.ok) return { ok: false, error: built.errors.join(" ") };
    try {
      const res = await fetch(`${url}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-ibm-token": token! },
        body: JSON.stringify({
          backend: built.request.backend,
          shots: built.request.shots,
          qasm: built.request.qasm,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, error: `Qiskit service responded ${res.status}.` };
      const body = (await res.json()) as { job_id?: unknown; status?: unknown };
      if (typeof body.job_id !== "string")
        return { ok: false, error: "Qiskit service returned no job id." };
      return {
        ok: true,
        jobId: body.job_id,
        status: typeof body.status === "string" ? body.status : "QUEUED",
      };
    } catch {
      return { ok: false, error: "Could not reach the Qiskit service." };
    }
  });

export const getIbmJob = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ jobId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<IbmJobStatus> => {
    const { token, url, missing } = config();
    if (missing.length) return { ok: false, error: "IBM Quantum execution is not configured." };
    try {
      const res = await fetch(`${url}/jobs/${data.jobId}`, {
        headers: { "x-ibm-token": token! },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, error: `Qiskit service responded ${res.status}.` };
      const body = (await res.json()) as { status?: unknown; counts?: unknown };
      const status = String(body.status ?? "UNKNOWN");
      return body.counts && typeof body.counts === "object"
        ? { ok: true, status, counts: body.counts as Record<string, number> }
        : { ok: true, status };
    } catch {
      return { ok: false, error: "Could not reach the Qiskit service." };
    }
  });
