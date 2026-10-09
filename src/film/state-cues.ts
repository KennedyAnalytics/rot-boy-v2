import { cueTime, type Cue } from './direction';
export type StateCue = { cue: Cue; props: Record<string, unknown> };
/** Snapshots/patches are authoritative; missing alignment fails closed. */
export const statePropsAt = (base: Record<string, unknown>, cues: StateCue[], time: number, words: {text:string;start:number}[], chapters: Parameters<typeof cueTime>[2]) => {
  let props = {...base};
  for (const item of cues) {
    const at = cueTime(item.cue, words, chapters);
    if (at !== null && at <= time) props = {...props, ...item.props};
  }
  return props;
};
