/**
 * Minimal syntax tokenizer and editor palette shared by the code scenes
 * (`code-reveal`, `code-accordion`, `code-diff-wipe`).
 *
 * This is deliberately not a real parser. A video shows a handful of lines for
 * a couple of seconds, so the goal is a believable colour rhythm — strings,
 * comments, keywords, types, calls — not correctness on pathological input.
 * Everything runs per frame, so it stays regex-based and allocation-light.
 */

export type CodeTokenKind =
  | "plain"
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "type"
  | "call"
  | "prop"
  | "punct"
  | "tag";

export type CodeToken = {
  text: string;
  kind: CodeTokenKind;
};

export type CodeTheme = {
  page: string;
  window: string;
  header: string;
  border: string;
  highlight: string;
  gutter: string;
  fg: string;
  dim: string;
  faint: string;
  band: string;
  shadow: string;
  token: Record<CodeTokenKind, string>;
};

/**
 * JetBrains Mono (and every other mono face worth shipping) advances 0.6em per
 * character. Carets and wipe masks are positioned arithmetically from this
 * rather than measured, so they stay exact in a headless render.
 */
export const MONO_ADVANCE = 0.6;

export const CODE_THEMES: Record<"dark" | "light", CodeTheme> = {
  dark: {
    page: "#1C212B",
    window: "#14181F",
    header: "rgba(243,240,230,0.05)",
    border: "rgba(243,240,230,0.12)",
    highlight: "rgba(226,91,58,0.18)",
    gutter: "rgba(243,240,230,0.03)",
    fg: "#F3F0E6",
    dim: "#B7B1A4",
    faint: "#8B938C",
    band: "rgba(243,240,230,0.06)",
    shadow: "rgba(0,0,0,0.35)",
    token: {
      plain: "#F3F0E6",
      comment: "#8B938C",
      string: "#8FCB9B",
      keyword: "#E25B3A",
      number: "#E25B3A",
      type: "#F3F0E6",
      call: "#F3F0E6",
      prop: "#E7C3B6",
      punct: "#B7B1A4",
      tag: "#E25B3A",
    },
  },
  light: {
    page: "#F3F0E6",
    window: "#FBF9F4",
    header: "rgba(28,33,43,0.04)",
    border: "rgba(28,33,43,0.16)",
    highlight: "rgba(226,91,58,0.14)",
    gutter: "rgba(28,33,43,0.03)",
    fg: "#1C212B",
    dim: "#5C6570",
    faint: "#8B938C",
    band: "rgba(28,33,43,0.06)",
    shadow: "rgba(28,33,43,0.12)",
    token: {
      plain: "#1C212B",
      comment: "#8B938C",
      string: "#2F8F5B",
      keyword: "#E25B3A",
      number: "#E25B3A",
      type: "#1C212B",
      call: "#1C212B",
      prop: "#5C6570",
      punct: "#5C6570",
      tag: "#E25B3A",
    },
  },
};

const KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "default",
  "const",
  "let",
  "var",
  "function",
  "return",
  "async",
  "await",
  "type",
  "interface",
  "class",
  "extends",
  "implements",
  "new",
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "throw",
  "typeof",
  "instanceof",
  "in",
  "of",
  "as",
  "null",
  "undefined",
  "true",
  "false",
  "this",
  "void",
  "yield",
  "public",
  "private",
  "readonly",
  "static",
  "def",
  "fn",
  "pub",
  "use",
  "struct",
  "enum",
  "match",
  "impl",
]);

/** Ordered scanners — first match at the cursor wins. */
const SCANNERS: Array<{ kind: CodeTokenKind; re: RegExp }> = [
  { kind: "comment", re: /^(\/\/[^\n]*|#[^\n]*)/ },
  { kind: "comment", re: /^\/\*[\s\S]*?(\*\/|$)/ },
  { kind: "string", re: /^(["'`])(?:\\.|(?!\1)[^\\])*(\1|$)/ },
  { kind: "number", re: /^(0x[\da-fA-F]+|\d+(\.\d+)?(e[+-]?\d+)?)\b/ },
  { kind: "plain", re: /^[A-Za-z_$][\w$]*/ },
  { kind: "punct", re: /^[^\sA-Za-z0-9_$]/ },
  { kind: "plain", re: /^\s+/ },
];

function classifyWord(
  word: string,
  before: string,
  after: string,
): CodeTokenKind {
  if (KEYWORDS.has(word)) return "keyword";
  if (/[<\/]$/.test(before.trimEnd()) && /^[A-Z]/.test(word)) return "tag";
  if (after.startsWith("(")) return "call";
  if (after.startsWith("=") && !after.startsWith("==")) return "prop";
  if (/^[A-Z]/.test(word)) return "type";
  return "plain";
}

/**
 * Split one line into coloured tokens. Block comments opened on an earlier
 * line are handled by the caller passing `inBlockComment` forward.
 */
export function tokenizeLine(
  line: string,
  inBlockComment = false,
): { tokens: CodeToken[]; inBlockComment: boolean } {
  const tokens: CodeToken[] = [];
  let rest = line;
  let offset = 0;
  let block = inBlockComment;

  if (block) {
    const end = rest.indexOf("*/");
    if (end === -1) {
      return { tokens: [{ text: rest, kind: "comment" }], inBlockComment: true };
    }
    tokens.push({ text: rest.slice(0, end + 2), kind: "comment" });
    offset = end + 2;
    rest = rest.slice(end + 2);
    block = false;
  }

  while (rest.length > 0) {
    let matched = false;

    for (const scanner of SCANNERS) {
      const match = scanner.re.exec(rest);
      if (!match || match[0].length === 0) continue;

      const text = match[0];
      let kind = scanner.kind;

      if (kind === "comment" && text.startsWith("/*") && !text.endsWith("*/")) {
        block = true;
      }
      if (kind === "plain" && /^[A-Za-z_$]/.test(text)) {
        kind = classifyWord(
          text,
          line.slice(0, offset),
          rest.slice(text.length),
        );
      }

      tokens.push({ text, kind });
      offset += text.length;
      rest = rest.slice(text.length);
      matched = true;
      break;
    }

    // Unreachable for well-formed input, but never spin on an unmatched char.
    if (!matched) {
      tokens.push({ text: rest[0], kind: "plain" });
      offset += 1;
      rest = rest.slice(1);
    }
  }

  return { tokens, inBlockComment: block };
}

/** Tokenize a whole listing, carrying block-comment state across lines. */
export function tokenizeCode(lines: string[]): CodeToken[][] {
  let block = false;
  return lines.map((line) => {
    const result = tokenizeLine(line, block);
    block = result.inBlockComment;
    return result.tokens;
  });
}

export type CodeLineProps = {
  tokens: CodeToken[];
  theme: CodeTheme;
  /**
   * Characters of the line to show. `undefined` shows all of it — pass a count
   * to reveal the line as if it were being written.
   */
  reveal?: number;
  /** Fades the whole line toward the theme's dim colour. */
  muted?: boolean;
};

/**
 * One rendered line of code. Characters past `reveal` are kept in the DOM at
 * zero opacity so the line never reflows as it writes in.
 */
export const CodeLine: React.FC<CodeLineProps> = ({
  tokens,
  theme,
  reveal,
  muted = false,
}) => {
  let consumed = 0;

  return (
    <span style={{ whiteSpace: "pre" }}>
      {tokens.map((token, index) => {
        const start = consumed;
        consumed += token.text.length;
        const shown =
          reveal === undefined
            ? token.text.length
            : Math.max(0, Math.min(token.text.length, reveal - start));
        const color = muted ? theme.faint : theme.token[token.kind];

        if (shown === token.text.length) {
          return (
            <span key={index} style={{ color }}>
              {token.text}
            </span>
          );
        }

        return (
          <span key={index} style={{ color }}>
            {token.text.slice(0, shown)}
            <span style={{ opacity: 0 }}>{token.text.slice(shown)}</span>
          </span>
        );
      })}
    </span>
  );
};

/** Total character count of a tokenized line. */
export function lineLength(tokens: CodeToken[]): number {
  return tokens.reduce((total, token) => total + token.text.length, 0);
}
