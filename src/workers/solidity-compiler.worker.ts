import wrapper from "solc/wrapper";

const SOLJSON_URL = "https://binaries.soliditylang.org/bin/soljson-v0.8.30+commit.73712a01.js";

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

type WorkerScope = DedicatedWorkerGlobalScope & typeof globalThis & {
  Module?: unknown;
};

const workerScope = self as WorkerScope;
let compiler: ReturnType<typeof wrapper> | null = null;

function ensureCompiler() {
  if (compiler) return compiler;

  workerScope.Module = {};
  importScripts(SOLJSON_URL);

  if (!workerScope.Module) {
    throw new Error("Solidity compiler binary did not initialize in the browser worker.");
  }

  compiler = wrapper(workerScope.Module);
  return compiler;
}

function compileSource(source: string): CompilerResult {
  let compilerVersion = "solc 0.8.30";

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
      errors: [error instanceof Error ? error.message : "Browser Solidity compiler failed."],
      warnings: [],
    };
  }
}

workerScope.addEventListener("message", (event: MessageEvent<CompileRequest>) => {
  const source = event.data?.source?.trim();
  if (!source) {
    workerScope.postMessage({
      ok: false,
      compilerVersion: "solc 0.8.30",
      errors: ["Solidity source is empty."],
      warnings: [],
    } satisfies CompilerResult);
    return;
  }

  workerScope.postMessage(compileSource(source));
});

export {};
