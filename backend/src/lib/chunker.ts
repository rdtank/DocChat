const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

function splitOn(text: string, separator: string): string[] {
  return separator === "" ? text.split("") : text.split(separator);
}

function mergeChunks(splits: string[], separator: string): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const split of splits) {
    const candidate = current ? current + separator + split : split;
    if (candidate.length <= CHUNK_SIZE) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      current = split;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

function splitRecursive(text: string, separators: string[]): string[] {
  const [sep, ...rest] = separators;
  if (sep === undefined) return [text];

  const splits = splitOn(text, sep);
  const good: string[] = [];
  const toSplit: string[] = [];

  for (const s of splits) {
    if (s.length <= CHUNK_SIZE) good.push(s);
    else toSplit.push(s);
  }

  const result = mergeChunks(good, sep);

  for (const large of toSplit) {
    result.push(...splitRecursive(large, rest));
  }

  return result.filter((c) => c.length > 0);
}

export function chunkText(text: string): string[] {
  const rawChunks = splitRecursive(text, SEPARATORS);
  if (rawChunks.length === 0) return [];

  const overlapped: string[] = [rawChunks[0]!];
  for (let i = 1; i < rawChunks.length; i++) {
    const prev = rawChunks[i - 1]!;
    const overlap = prev.slice(-CHUNK_OVERLAP);
    overlapped.push((overlap + " " + rawChunks[i]!).trim());
  }
  return overlapped;
}
