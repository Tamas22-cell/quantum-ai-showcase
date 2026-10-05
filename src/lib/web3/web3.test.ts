import { describe, expect, it } from "vitest";
import { ArgError, formatValue, parseArg } from "./abi-args";
import { runSecurityChecks, stripSolidity } from "./security";
import { explorerCompilerVersion } from "@/components/web3/verification-panel";
import { TESTNETS, verifyUrl } from "./chains";

describe("abi arg parsing", () => {
  it("parses scalars", () => {
    expect(parseArg("bool", "true")).toBe(true);
    expect(parseArg("uint8", "255")).toBe(255n);
    expect(() => parseArg("uint8", "256")).toThrow(ArgError);
    expect(parseArg("int16", "-5")).toBe(-5n);
    expect(parseArg("address", "0x52908400098527886e0f7030069857d2e4169ee7")).toBe("0x52908400098527886E0F7030069857D2E4169EE7");
    expect(() => parseArg("address", "0x123")).toThrow(ArgError);
  });
  it("parses bytes32 hex and text: shorthand", () => {
    expect(parseArg("bytes32", "text:hi")).toBe("0x6869" + "0".repeat(60));
    expect(() => parseArg("bytes32", "0x12")).toThrow(ArgError);
  });
  it("parses arrays", () => {
    expect(parseArg("uint256[]", "[1,2]")).toEqual([1n, 2n]);
    expect(() => parseArg("uint256[2]", "[1]")).toThrow(ArgError);
    expect(parseArg("string[]", '["a","b"]')).toEqual(["a", "b"]);
  });
  it("formats bigints", () => expect(formatValue({ a: 1n })).toContain('"1"'));
});

describe("security heuristics", () => {
  const abi = [{ type: "function", name: "store", stateMutability: "nonpayable" }];
  it("flags risky patterns but ignores comments", () => {
    const c = runSecurityChecks({ source: "pragma solidity ^0.8.24; // tx.origin\ncontract A { function f() external { (bool ok,) = msg.sender.call(\"\"); selfdestruct(payable(msg.sender)); } }", abi, compiled: true, errors: 0, warnings: 0 });
    const by = Object.fromEntries(c.map((x) => [x.id, x.status]));
    expect(by["tx-origin"]).toBe("pass");
    expect(by["low-level-call"]).toBe("warn");
    expect(by["selfdestruct"]).toBe("warn");
    expect(by["pragma"]).toBe("info");
  });
  it("warns on unguarded writes", () => {
    const c = runSecurityChecks({ source: "pragma solidity 0.8.30; contract A { function store() external {} }", abi, compiled: true, errors: 0, warnings: 0 });
    expect(c.find((x) => x.id === "access")!.status).toBe("warn");
    expect(stripSolidity('"tx.origin"')).not.toContain("tx.origin");
  });
});

describe("explorer helpers", () => {
  it("formats compiler version and verify url", () => {
    expect(explorerCompilerVersion("0.8.30+commit.73712a01.Emscripten.clang")).toBe("v0.8.30+commit.73712a01");
    expect(verifyUrl(TESTNETS[1]!, "0xabc")).toBe("https://sepolia.basescan.org/verifyContract?a=0xabc");
  });
});
