export interface Edge { debtorId: string; creditorId: string; amount: number } // cents

/** Net balance per person from the viewpoint of `meId`: positive = others owe you. */
export function netForUser(edges: Edge[], meId: string): Map<string, number> {
  const net = new Map<string, number>();
  const bump = (id: string, d: number) => net.set(id, (net.get(id) ?? 0) + d);
  for (const e of edges) {
    if (e.creditorId === meId) bump(e.debtorId, e.amount);   // they owe you
    if (e.debtorId === meId) bump(e.creditorId, -e.amount);  // you owe them
  }
  return net;
}
