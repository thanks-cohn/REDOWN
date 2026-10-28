// Session-owned navigation and compact attempts; never performs file operations.
export function questionHistory(state, count) {
  const reached = Math.max(0, Math.min(count - 1, Math.max(state.index || 0,
    ...state.records.filter(r => r.verdict !== 'NOT_TESTED').map(r => r.exerciseId - 1))));
  state.questionHistory ||= {highest: reached, origin: null, active: {}, attempts: {}};
  const h = state.questionHistory;
  h.highest = Math.max(h.highest, reached);
  const current = () => state.records[state.index];
  function begin() {
    const id = current().exerciseId, old = h.active[id];
    if (old) finish(id, old.id, null, 'Superseded by a new attempt.');
    const list = h.attempts[id] ||= [];
    const attempt = {id: crypto.randomUUID(), exerciseId: id, number: list.length + 1, startedAt: Date.now()};
    list.push(attempt);
    h.active[id] = {...attempt, record: {...structuredClone(current()), verdict: 'NOT_TESTED', observedGuiInteraction: null, independentlyObservedResult: null, actualApiOperation: null, providerResponse: null, apiObservations: [], readObservations: [], interactions: [], sha256Comparisons: [], testOwnedObjectIdentities: [], observationFailure: null, returnLocations: null}};
    return h.active[id];
  }
  function finish(id, attemptId, result, reason) {
    const active = h.active[id];
    if (!active || active.id !== attemptId) return false;
    const a = h.attempts[id].find(a => a.id === attemptId);
    Object.assign(a, {operation: active.record.actualApiOperation||undefined, commandId: active.record.observedGuiInteraction?.command?.id, completedAt: Date.now(), result: result || 'CANCELED', reason});
    if (result) state.records[id - 1] = {...active.record, verdict: result};
    delete h.active[id];
    return true;
  }
  function jump(i) {
    if (!Number.isInteger(i) || i < 0 || i > h.highest) return false;
    if (i < state.index && h.origin === null) h.origin = state.index;
    state.index = i;
    if (i === h.origin) h.origin = null;
    return true;
  }
  function reach(i) { h.highest = Math.max(h.highest, i); state.index = i; }
  return {h, begin, finish, jump, reach, entries: () => state.records.slice(0, h.highest + 1),
    counts: () => state.records.reduce((out, r) => (out[r.verdict] = (out[r.verdict] || 0) + 1, out), {})};
}
