import type { Code } from "../types";

export function findRootByName(codes: Code[], name: string): Code | null {
  return codes.find((c) => c.name === name) ?? null;
}

function findInTree(nodes: Code[], id: number): Code | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findInTree(node.children, id);
    if (found) return found;
  }
  return null;
}

export function codeName(codes: Code[], id: number | null): string {
  if (id == null) return "-";
  const found = findInTree(codes, id);
  return found ? found.name : "-";
}

export function findCodeById(codes: Code[], id: number | null): Code | null {
  if (id == null) return null;
  return findInTree(codes, id);
}
