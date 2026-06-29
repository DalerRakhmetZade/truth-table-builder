// Tokenizer, parser, and evaluator for logical expressions. Pure — no DOM.
//
// Grammar (precedence low -> high):
//   iff   := imp ( '↔' imp )*            (left-assoc)
//   imp   := or  ( '→' imp )?            (right-assoc)
//   or    := and ( ('∨'|'⊕') and )*      (left-assoc)
//   and   := unary ( '∧' unary )*        (left-assoc)
//   unary := '¬' unary | primary
//   primary := VAR | CONST | '(' iff ')'

export const T = {
  VAR: "VAR", NOT: "NOT", AND: "AND", OR: "OR", XOR: "XOR",
  IMP: "IMP", IFF: "IFF", LP: "LP", RP: "RP", CONST: "CONST",
};

export function tokenize(input, varSet) {
  varSet = varSet || new Set();
  const tokens = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") { i++; continue; }

    // multi-char ASCII operators
    if (s.startsWith("<->", i)) { tokens.push({ t: T.IFF }); i += 3; continue; }
    if (s.startsWith("->", i))  { tokens.push({ t: T.IMP }); i += 2; continue; }

    switch (ch) {
      case "¬": case "~": case "!": tokens.push({ t: T.NOT }); i++; continue;
      case "∧": case "&": case "*": case ".": tokens.push({ t: T.AND }); i++; continue;
      case "∨": case "|": case "+": tokens.push({ t: T.OR }); i++; continue;
      case "⊕": case "^": tokens.push({ t: T.XOR }); i++; continue;
      case "→": tokens.push({ t: T.IMP }); i++; continue;
      case "↔": case "=": tokens.push({ t: T.IFF }); i++; continue;
      case "(": tokens.push({ t: T.LP }); i++; continue;
      case ")": tokens.push({ t: T.RP }); i++; continue;
    }

    // constants
    if (ch === "1") { tokens.push({ t: T.CONST, v: true }); i++; continue; }
    if (ch === "0") { tokens.push({ t: T.CONST, v: false }); i++; continue; }

    // identifier: variable name (may be multi-character)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      const name = s.slice(i, j);
      i = j;
      if (varSet.has(name)) { tokens.push({ t: T.VAR, name: name }); continue; }
      if (name === "T") { tokens.push({ t: T.CONST, v: true }); continue; }
      if (name === "F") { tokens.push({ t: T.CONST, v: false }); continue; }
      throw new Error("“" + name + "” isn't one of this table's variables.");
    }
    throw new Error("Unexpected character “" + ch + "”.");
  }
  return tokens;
}

export function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const expect = (t) => {
    const tok = next();
    if (!tok || tok.t !== t) {
      if (t === T.RP) throw new Error("Missing a closing parenthesis “)”.");
      throw new Error("Unexpected " + describeToken(tok) + " here.");
    }
    return tok;
  };

  function parseIff() {
    let left = parseImp();
    while (peek() && peek().t === T.IFF) { next(); const right = parseImp(); left = { op: "IFF", l: left, r: right }; }
    return left;
  }
  function parseImp() {
    const left = parseOr();
    if (peek() && peek().t === T.IMP) { next(); const right = parseImp(); return { op: "IMP", l: left, r: right }; }
    return left;
  }
  function parseOr() {
    let left = parseAnd();
    while (peek() && (peek().t === T.OR || peek().t === T.XOR)) {
      const op = next().t === T.OR ? "OR" : "XOR";
      const right = parseAnd();
      left = { op, l: left, r: right };
    }
    return left;
  }
  function parseAnd() {
    let left = parseUnary();
    while (peek() && peek().t === T.AND) { next(); const right = parseUnary(); left = { op: "AND", l: left, r: right }; }
    return left;
  }
  function parseUnary() {
    if (peek() && peek().t === T.NOT) { next(); return { op: "NOT", e: parseUnary() }; }
    return parsePrimary();
  }
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new Error("The expression looks unfinished — add a variable or value at the end.");
    if (tok.t === T.VAR) { next(); return { op: "VAR", name: tok.name }; }
    if (tok.t === T.CONST) { next(); return { op: "CONST", v: tok.v }; }
    if (tok.t === T.LP) { next(); const e = parseIff(); expect(T.RP); return e; }
    if (tok.t === T.RP) throw new Error("Unexpected “)” — check your parentheses.");
    // an operator turned up where a variable/value was expected
    throw new Error("Unexpected " + describeToken(tok) + " — a variable or value was expected here.");
  }

  const ast = parseIff();
  if (pos !== tokens.length) {
    throw new Error("Unexpected " + describeToken(tokens[pos]) + " — did you miss an operator (∧ ∨ → ↔ ⊕) before it?");
  }
  return ast;
}

// Human-readable label for a token, used in parser error messages.
const TOKEN_SYMBOL = { NOT: "¬", AND: "∧", OR: "∨", XOR: "⊕", IMP: "→", IFF: "↔", LP: "(", RP: ")" };
function describeToken(tok) {
  if (!tok) return "the end of the expression";
  if (tok.t === T.VAR) return "“" + tok.name + "”";
  if (tok.t === T.CONST) return "“" + (tok.v ? "T" : "F") + "”";
  const s = TOKEN_SYMBOL[tok.t];
  return s ? "“" + s + "”" : "that";
}

export function compile(expr, varList) {
  const trimmed = (expr || "").trim();
  if (!trimmed) return null;
  const ast = parse(tokenize(trimmed, new Set(varList || [])));
  const vars = new Set();
  collectVars(ast, vars);
  return { ast, vars };
}

export function collectVars(node, set) {
  if (!node) return;
  if (node.op === "VAR") set.add(node.name);
  else if (node.op === "NOT") collectVars(node.e, set);
  else if (node.l) { collectVars(node.l, set); collectVars(node.r, set); }
}

export function evalAst(node, env) {
  switch (node.op) {
    case "CONST": return node.v;
    case "VAR": {
      if (!(node.name in env)) throw new Error("Unknown variable " + node.name);
      return env[node.name];
    }
    case "NOT": return !evalAst(node.e, env);
    case "AND": return evalAst(node.l, env) && evalAst(node.r, env);
    case "OR":  return evalAst(node.l, env) || evalAst(node.r, env);
    case "XOR": return evalAst(node.l, env) !== evalAst(node.r, env);
    case "IMP": return !evalAst(node.l, env) || evalAst(node.r, env);
    case "IFF": return evalAst(node.l, env) === evalAst(node.r, env);
  }
  throw new Error("Bad node");
}
