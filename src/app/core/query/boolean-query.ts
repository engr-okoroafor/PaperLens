import { Paper } from '../models/paper';

export type CompareOp = '>' | '<' | '>=' | '<=';

export type QueryNode =
  | { type: 'term'; value: string }
  | { type: 'phrase'; value: string }
  | { type: 'field'; field: string; value: string }
  | { type: 'compare'; field: string; op: CompareOp; value: number }
  | { type: 'not'; node: QueryNode }
  | { type: 'and'; nodes: QueryNode[] }
  | { type: 'or'; nodes: QueryNode[] }
  | { type: 'exists'; field: string };

export type TokenKind = 'ws' | 'op' | 'paren' | 'phrase' | 'field' | 'compare' | 'exists' | 'term' | 'error';

export interface QueryToken {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
}

export interface ParsedQuery {
  valid: boolean;
  errors: string[];
  ast: QueryNode | null;
  tokens: QueryToken[];
}

export const EXAMPLE_QUERIES = [
  '(drone AND (package OR delivery))',
  'title:"machine learning" AND yearPublished>2020',
  '(climate OR biodiversity) AND _exists_:doi',
  'authors:Keller AND NOT title:warehouse',
] as const;

export function parseQuery(input: string): ParsedQuery {
  const tokens = tokenize(input);
  const errors: string[] = [];
  if (tokens.some((token) => token.kind === 'error')) {
    errors.push('A quote is missing its closing mark.');
  }

  let depth = 0;
  for (const token of tokens) {
    if (token.kind !== 'paren') {
      continue;
    }
    depth += token.text === '(' ? 1 : -1;
    if (depth < 0) {
      errors.push('A closing parenthesis has no match.');
      depth = 0;
    }
  }
  if (depth > 0) {
    errors.push('A parenthesis is still open.');
  }

  const significant = tokens.filter((token) => token.kind !== 'ws');
  if (significant.length === 0) {
    return { valid: errors.length === 0, errors, ast: null, tokens };
  }

  const parsed = parseTokens(significant, errors);
  const unique = [...new Set(errors)];
  return { valid: unique.length === 0 && parsed !== null, errors: unique, ast: parsed, tokens };
}

export function matchesPaper(paper: Paper, node: QueryNode): boolean {
  switch (node.type) {
    case 'and':
      return node.nodes.every((child) => matchesPaper(paper, child));
    case 'or':
      return node.nodes.some((child) => matchesPaper(paper, child));
    case 'not':
      return !matchesPaper(paper, node.node);
    case 'term':
    case 'phrase':
      return haystack(paper).includes(node.value.toLowerCase());
    case 'field':
      return fieldText(paper, node.field).toLowerCase().includes(node.value.toLowerCase());
    case 'compare':
      return compareValue(paper, node.field, node.op, node.value);
    case 'exists':
      return fieldExists(paper, node.field);
  }
}

export function positiveTerms(node: QueryNode | null): string[] {
  if (!node) {
    return [];
  }
  switch (node.type) {
    case 'not':
      return [];
    case 'and':
    case 'or':
      return node.nodes.flatMap((child) => positiveTerms(child));
    case 'term':
    case 'phrase':
    case 'field':
      return node.value ? [node.value] : [];
    default:
      return [];
  }
}

export function insertClause(current: string, clause: string): string {
  const base = current.trim();
  const next = clause.trim();
  if (!next) {
    return current;
  }
  if (!base) {
    return next;
  }
  if (/^(AND|OR|NOT|\(|\))$/i.test(next)) {
    return `${base} ${next}`;
  }
  if (/\b(AND|OR|\()\s*$/i.test(base)) {
    return `${base} ${next}`;
  }
  return `${base} AND ${next}`;
}

function tokenize(input: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  let index = 0;
  while (index < input.length) {
    const start = index;
    const character = input[index] ?? '';
    if (/\s/.test(character)) {
      while (index < input.length && /\s/.test(input[index] ?? '')) {
        index += 1;
      }
      tokens.push({ kind: 'ws', text: input.slice(start, index), start, end: index });
      continue;
    }
    if (character === '(' || character === ')') {
      index += 1;
      tokens.push({ kind: 'paren', text: character, start, end: index });
      continue;
    }
    if (character === '"') {
      index += 1;
      let closed = false;
      while (index < input.length) {
        if (input[index] === '"') {
          closed = true;
          index += 1;
          break;
        }
        index += 1;
      }
      tokens.push({ kind: closed ? 'phrase' : 'error', text: input.slice(start, index), start, end: index });
      continue;
    }
    if (character === '+') {
      index += 1;
      tokens.push({ kind: 'op', text: 'AND', start, end: index });
      continue;
    }

    while (index < input.length && !/[\s()"]/.test(input[index] ?? '')) {
      index += 1;
    }
    const raw = input.slice(start, index);
    const upper = raw.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      tokens.push({ kind: 'op', text: upper, start, end: index });
      continue;
    }
    if (/^_exists_:[\w.]+$/i.test(raw)) {
      tokens.push({ kind: 'exists', text: raw, start, end: index });
      continue;
    }
    if (/^[_A-Za-z][\w.]*(?:>=|<=|>|<)-?\d+(?:\.\d+)?$/.test(raw)) {
      tokens.push({ kind: 'compare', text: raw, start, end: index });
      continue;
    }
    if (/^[_A-Za-z][\w.]*:.+/.test(raw)) {
      tokens.push({ kind: 'field', text: raw, start, end: index });
      continue;
    }
    if (/^[_A-Za-z][\w.]*:$/.test(raw) && input[index] === '"') {
      index += 1;
      let closed = false;
      while (index < input.length) {
        if (input[index] === '"') {
          closed = true;
          index += 1;
          break;
        }
        index += 1;
      }
      tokens.push({ kind: closed ? 'field' : 'error', text: input.slice(start, index), start, end: index });
      continue;
    }
    tokens.push({ kind: 'term', text: raw, start, end: index });
  }
  return tokens;
}

function parseTokens(tokens: QueryToken[], errors: string[]): QueryNode | null {
  let position = 0;
  const peek = (): QueryToken | undefined => tokens[position];
  const eat = (): QueryToken | undefined => tokens[position++];

  const parseOr = (): QueryNode | null => {
    const left = parseAnd();
    if (!left) {
      return null;
    }
    const nodes = [left];
    while (peek()?.kind === 'op' && peek()?.text === 'OR') {
      eat();
      const right = parseAnd();
      if (!right) {
        errors.push('OR needs a term on both sides.');
        break;
      }
      nodes.push(right);
    }
    return nodes.length === 1 ? left : { type: 'or', nodes };
  };

  const parseAnd = (): QueryNode | null => {
    const left = parseNot();
    if (!left) {
      return null;
    }
    const nodes = [left];
    while (true) {
      const next = peek();
      if (!next || (next.kind === 'paren' && next.text === ')') || (next.kind === 'op' && next.text === 'OR')) {
        break;
      }
      if (next.kind === 'op' && next.text === 'AND') {
        eat();
        const right = parseNot();
        if (!right) {
          errors.push('AND needs a term on both sides.');
          break;
        }
        nodes.push(right);
        continue;
      }
      if (next.kind === 'term' || next.kind === 'phrase' || next.kind === 'field' || next.kind === 'compare' || next.kind === 'exists' || next.kind === 'paren' || (next.kind === 'op' && next.text === 'NOT')) {
        const right = parseNot();
        if (!right) {
          break;
        }
        nodes.push(right);
        continue;
      }
      errors.push(`Unexpected ${next.text}.`);
      eat();
    }
    return nodes.length === 1 ? left : { type: 'and', nodes };
  };

  const parseNot = (): QueryNode | null => {
    if (peek()?.kind === 'op' && peek()?.text === 'NOT') {
      eat();
      const inner = parseNot();
      if (!inner) {
        errors.push('NOT needs a term to negate.');
        return null;
      }
      return { type: 'not', node: inner };
    }
    return parsePrimary();
  };

  const parsePrimary = (): QueryNode | null => {
    const token = peek();
    if (!token) {
      errors.push('The query ends on an operator.');
      return null;
    }
    if (token.kind === 'paren' && token.text === '(') {
      eat();
      if (peek()?.kind === 'paren' && peek()?.text === ')') {
        errors.push('Parentheses are empty.');
        eat();
        return null;
      }
      const inner = parseOr();
      if (peek()?.kind === 'paren' && peek()?.text === ')') {
        eat();
      } else {
        errors.push('A parenthesis is still open.');
      }
      return inner;
    }
    if (token.kind === 'op') {
      errors.push(`${token.text} is missing a term.`);
      eat();
      return null;
    }
    eat();
    if (token.kind === 'term') {
      return { type: 'term', value: token.text };
    }
    if (token.kind === 'phrase') {
      const value = token.text.slice(1, token.text.endsWith('"') ? -1 : undefined);
      if (!value) {
        errors.push('A quoted phrase is empty.');
      }
      return { type: 'phrase', value };
    }
    if (token.kind === 'field') {
      const match = /^([_A-Za-z][\w.]*):(?:"([\s\S]*)"|([\s\S]+))$/.exec(token.text);
      const value = (match?.[2] ?? match?.[3] ?? '').trim();
      if (!match || !value) {
        errors.push('A field filter needs a value.');
        return null;
      }
      return { type: 'field', field: match[1], value };
    }
    if (token.kind === 'compare') {
      const match = /^([_A-Za-z][\w.]*)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/.exec(token.text);
      if (!match) {
        errors.push('A comparison is incomplete.');
        return null;
      }
      return { type: 'compare', field: match[1], op: match[2] as CompareOp, value: Number(match[3]) };
    }
    if (token.kind === 'exists') {
      const field = token.text.slice(token.text.indexOf(':') + 1);
      if (!field) {
        errors.push('_exists_ needs a field name.');
        return null;
      }
      return { type: 'exists', field };
    }
    return null;
  };

  const ast = parseOr();
  if (position < tokens.length) {
    errors.push('Part of the query could not be read.');
  }
  return ast;
}

function haystack(paper: Paper): string {
  return [paper.title, paper.abstract, paper.authors.join(' '), paper.publisher, paper.journal, paper.doi, paper.language, paper.documentType, paper.fieldOfStudy]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function fieldText(paper: Paper, field: string): string {
  switch (normalizeField(field)) {
    case 'title':
      return paper.title;
    case 'authors':
    case 'author':
      return paper.authors.join(' ');
    case 'abstract':
      return paper.abstract ?? '';
    case 'publisher':
      return paper.publisher ?? '';
    case 'journal':
    case 'journals':
      return paper.journal ?? '';
    case 'language':
      return paper.language ?? '';
    case 'documenttype':
      return paper.documentType ?? '';
    case 'doi':
      return paper.doi ?? '';
    case 'yearpublished':
    case 'year':
      return paper.year ? String(paper.year) : '';
    case 'fieldofstudy':
    case 'topic':
      return paper.fieldOfStudy ?? '';
    case 'fulltext':
      return paper.hasFullText ? 'available' : '';
    default:
      return haystack(paper);
  }
}

function compareValue(paper: Paper, field: string, op: CompareOp, value: number): boolean {
  const key = normalizeField(field);
  const current = key === 'citationcount' ? paper.citationCount : key === 'yearpublished' || key === 'year' ? paper.year : null;
  if (current === null) {
    return false;
  }
  switch (op) {
    case '>':
      return current > value;
    case '<':
      return current < value;
    case '>=':
      return current >= value;
    case '<=':
      return current <= value;
  }
}

function fieldExists(paper: Paper, field: string): boolean {
  switch (normalizeField(field)) {
    case 'doi':
      return Boolean(paper.doi);
    case 'fulltext':
    case 'downloadurl':
      return paper.hasFullText;
    case 'abstract':
      return Boolean(paper.abstract);
    case 'citationcount':
      return paper.citationCount !== null;
    default:
      return fieldText(paper, field).trim().length > 0;
  }
}

function normalizeField(field: string): string {
  return field.toLowerCase().replace(/_/g, '');
}
