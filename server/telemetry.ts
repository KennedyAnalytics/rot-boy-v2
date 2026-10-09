export type StageTelemetry = {
  stage: string;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  durationMs: number;
  retries: number;
  at: string;
};

/** Cost is recorded only when the operator supplies published rates. Nothing is guessed. */
export const estimateCostUsd = (inputTokens: number | null, outputTokens: number | null) => {
  const inputRate = Number(process.env.LLM_INPUT_USD_PER_MILLION);
  const outputRate = Number(process.env.LLM_OUTPUT_USD_PER_MILLION);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate < 0 || outputRate < 0) return null;
  return Number((((inputTokens ?? 0) * inputRate + (outputTokens ?? 0) * outputRate) / 1_000_000).toFixed(4));
};

export const stageTelemetry = (entry: Omit<StageTelemetry, "costUsd" | "at"> & { costUsd?: number | null }): StageTelemetry => ({
  ...entry,
  costUsd: entry.costUsd === undefined ? estimateCostUsd(entry.inputTokens, entry.outputTokens) : entry.costUsd,
  at: new Date().toISOString(),
});
