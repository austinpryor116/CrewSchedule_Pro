/**
 * FOS CODES (src/lib/fosCodes.ts)
 * Re-exports everything from the single source of truth: src/lib/decsReference.ts
 */
export * from "./decsReference";
export type FosCodeInfo = import("./decsReference").FosCodeDefinition;
