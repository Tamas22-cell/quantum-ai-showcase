import wrapper from "solc/wrapper";
// solc ships soljson.js without TypeScript declarations, but Vite can bundle it into this worker.
// @ts-expect-error no declaration file for solc/soljson.js
import soljson from "solc/soljson.js";

type CompileRequest = {
  source: string;
};

type CompilerResult =
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

const workerScope = self as DedicatedWorkerGlobalScope & typeof globalThis;

let compiler: ReturnType<typeof wrapper> | null = null;

function ensureCompiler() {
  if (compiler) return compiler;

  const candidate = (soljson as unknown) as Parameters<typeof wrapper>[0];
  compiler = wrapper(candidate);

  if (typeof compiler.version !== "function" || typeof compiler.compile !== "function") {
    compiler = null;
    throw new Error("Bundled Solidity compiler API is unavailable.");
  }

  return compiler;
}

function compileSource(source: string): CompilerResult {
  let compilerVersion = "solc bundled";

  try {
    const solc = ensureCompiler();
    compilerVersion = solc.version();

    const input = {
      language: "Solidity",
      sources: {
        "Contract.sol": { content: source },
      },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
          },
        },
      },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const diagnostics = Array.isArray(output?.errors) ? output.errors : [];
    const errors = diagnostics
      .filter((item: any) => item?.severity === "error")
      .map((item: any) => item?.formattedMessage || item?.message || "Compilation error");
    const warnings = diagnostics
      .filter((item: any) => item?.severity !== "error")
      .map((item: any) => item?.formattedMessage || item?.message || "Compiler warning");

    if (errors.length) return { ok: false, compilerVersion, errors, warnings };

    const contracts = output?.contracts?.["Contract.sol"] ?? {};
    const names = Object.keys(contracts);
    if (!names.length) {
      return {
        ok: false,
        compilerVersion,
        errors: ["No Solidity contract was produced."],
        warnings,
      };
    }

    const contractName = names[0];
    const compiled = contracts[contractName];
    const bytecodeObject = compiled?.evm?.bytecode?.object ?? "";
    const deployedBytecodeObject = compiled?.evm?.deployedBytecode?.object ?? "";

    if (!bytecodeObject) {
      return {
        ok: false,
        compilerVersion,
        errors: ["Compilation completed, but no deployable bytecode was produced."],
        warnings,
      };
    }

    return {
      ok: true,
      compilerVersion,
      contractName,
      abi: Array.isArray(compiled?.abi) ? compiled.abi : [],
      bytecode: `0x${bytecodeObject}`,
      deployedBytecode: deployedBytecodeObject ? `0x${deployedBytecodeObject}` : "0x",
      warnings,
    };
  } catch (error) {
    return {
      ok: false,
      compilerVersion,
      errors: [error instanceof Error ? error.message : "Bundled browser Solidity compiler failed."],
      warnings: [],
    };
  }
}

workerScope.addEventListener("message", (event: MessageEvent<CompileRequest>) => {
  const source = event.data?.source?.trim();
  if (!source) {
    workerScope.postMessage({
      ok: false,
      compilerVersion: "solc bundled",
      errors: ["Solidity source is empty."],
      warnings: [],
    } satisfies CompilerResult);
    return;
  }

  workerScope.postMessage(compileSource(source));
});

export {};
