import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import solc from "solc";

const CompileInput = z.object({
  source: z.string().min(1).max(40_000),
});

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

export const compileSolidity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CompileInput.parse(input))
  .handler(async ({ data }): Promise<SolidityCompileResult> => {
    const compilerVersion = solc.version();

    const input = {
      language: "Solidity",
      sources: {
        "Contract.sol": {
          content: data.source,
        },
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        outputSelection: {
          "*": {
            "*": [
              "abi",
              "evm.bytecode.object",
              "evm.deployedBytecode.object",
            ],
          },
        },
      },
    };

    let output: any;
    try {
      output = JSON.parse(solc.compile(JSON.stringify(input)));
    } catch (error) {
      return {
        ok: false,
        compilerVersion,
        errors: [error instanceof Error ? error.message : "Solidity compiler failed."],
        warnings: [],
      };
    }

    const diagnostics = Array.isArray(output?.errors) ? output.errors : [];
    const errors = diagnostics
      .filter((item: any) => item?.severity === "error")
      .map((item: any) => item?.formattedMessage || item?.message || "Compilation error");
    const warnings = diagnostics
      .filter((item: any) => item?.severity !== "error")
      .map((item: any) => item?.formattedMessage || item?.message || "Compiler warning");

    if (errors.length) {
      return { ok: false, compilerVersion, errors, warnings };
    }

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
  });
