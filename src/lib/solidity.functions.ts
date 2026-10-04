export type SolidityCompileResult =
  | {
      ok: true;
      compilerVersion: string;
      contractName: string;
      abi: unknown[];
      bytecode: string;
      deployedBytecode: string;
      warnings: string[];
    }
  | {
      ok: false;
      compilerVersion: string;
      errors: string[];
      warnings: string[];
    };

type CompileArgs = {
  data: {
    source: string;
  };
};

export async function compileSolidity({ data }: CompileArgs): Promise<SolidityCompileResult> {
  const source = data.source.trim();

  if (!source) {
    return {
      ok: false,
      compilerVersion: "solc 0.8.30",
      errors: ["Solidity source is empty."],
      warnings: [],
    };
  }

  if (source.length > 40_000) {
    return {
      ok: false,
      compilerVersion: "solc 0.8.30",
      errors: ["Solidity source is too large for this lab."],
      warnings: [],
    };
  }

  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return {
      ok: false,
      compilerVersion: "solc 0.8.30",
      errors: ["Browser Web Worker is unavailable."],
      warnings: [],
    };
  }

  return await new Promise<SolidityCompileResult>((resolve) => {
    const worker = new Worker(new URL("../workers/solidity-compiler.worker.ts", import.meta.url));

    const timeout = window.setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        compilerVersion: "solc 0.8.30",
        errors: ["Solidity compilation timed out after 45 seconds."],
        warnings: [],
      });
    }, 45_000);

    worker.addEventListener(
      "message",
      (event: MessageEvent<SolidityCompileResult>) => {
        window.clearTimeout(timeout);
        worker.terminate();
        resolve(event.data);
      },
      { once: true },
    );

    worker.addEventListener(
      "error",
      (event) => {
        window.clearTimeout(timeout);
        worker.terminate();
        resolve({
          ok: false,
          compilerVersion: "solc 0.8.30",
          errors: [event.message || "Solidity compiler worker failed to start."],
          warnings: [],
        });
      },
      { once: true },
    );

    worker.postMessage({ source });
  });
}
