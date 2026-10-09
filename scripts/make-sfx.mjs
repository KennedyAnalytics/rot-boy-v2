/**
 * Builds the house sound-design palette deterministically with ffmpeg. Each
 * sound names a motion meaning, not a decoration:
 *   whoosh   an action leaves its source (traverse / return / accumulate)
 *   land     a consequence lands (progress)
 *   chime    a result completes
 *   knock    an action is refused or blocked
 *   type     a row is typed into a software window
 *   retrieve a familiar object returns (recap retrieval)
 *   branch   a hypothetical copy splits off
 *
 *   node scripts/make-sfx.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('public', 'sfx');
fs.mkdirSync(dir, { recursive: true });
const sr = 48000;
const make = (name, expr, seconds, filters = '') => {
  const out = path.join(dir, `${name}.wav`);
  const graph = `aevalsrc=exprs='${expr}':s=${sr}:d=${seconds}${filters ? `,${filters}` : ''},afade=t=out:st=${(seconds - 0.03).toFixed(3)}:d=0.03`;
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', graph, '-ac', '2', '-c:a', 'pcm_s16le', out]);
  console.log('wrote', path.relative(process.cwd(), out));
};

// Air moving past: band-limited noise with a swelling envelope.
make('whoosh', '0.55*(random(0)*2-1)*pow(sin(PI*t/0.42),2)', 0.42, 'highpass=f=380,lowpass=f=2600,volume=0.8');
// A soft wooden tap: short pitched body with a fast decay.
make('land', '0.5*sin(2*PI*660*t)*exp(-34*t)+0.25*sin(2*PI*1320*t)*exp(-48*t)', 0.16);
// Two-note rising chime for a completed result.
make('chime', '0.32*sin(2*PI*1046.5*t)*exp(-5.5*t)+0.30*sin(2*PI*1567.98*t)*exp(-5.5*(t-0.11))*gte(t,0.11)', 0.75);
// A low muted knock for refusal.
make('knock', '0.7*sin(2*PI*(96+60*exp(-25*t))*t)*exp(-16*t)+0.18*(random(0)*2-1)*exp(-60*t)', 0.32, 'lowpass=f=1400');
// Four light key clicks.
make('type', '0.5*(random(0)*2-1)*(exp(-260*t)+exp(-260*(t-0.085))*gte(t,0.085)+exp(-260*(t-0.17))*gte(t,0.17)+exp(-260*(t-0.25))*gte(t,0.25))', 0.36, 'highpass=f=1800,lowpass=f=7000');
// A gentle rising tone for something familiar returning.
make('retrieve', '0.28*sin(2*PI*(420*t+420*t*t))*sin(PI*t/0.5)', 0.5, 'lowpass=f=3000');
// An airy shimmer for a hypothetical split.
make('branch', '0.18*sin(2*PI*1244.5*t)*(0.6+0.4*sin(2*PI*14*t))*exp(-4*t)+0.12*(random(0)*2-1)*exp(-9*t)', 0.6, 'highpass=f=900,lowpass=f=6000');
