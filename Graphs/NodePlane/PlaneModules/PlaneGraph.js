/* ═══════════════════════════════════════════════════════════════════════════
   PlaneGraph.js  –  Graph data & mutation submodule
   Provides: getNodes, getEdges, nodeById, nodeByName, edgeExists,
             adjacencyMatrix, adjacencyList,
             addNode, removeNode, addEdge, removeEdge, clear
   Attaches to: window.Plane.graph
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const WORLD_W = 100;
  const WORLD_H = 50;

  /* ── State ───────────────────────────────────────────────────────────────── */
  let nodes = [];
  let edges = [];
  let _nid  = 0;
  let _eid  = 0;

  /* ── Lookups ─────────────────────────────────────────────────────────────── */
  function nodeById(id)   { return nodes.find(n => n.id   === id); }
  function nodeByName(nm) { return nodes.find(n => n.name === nm); }

  function edgeExists(fromId, toId) {
    return edges.some(e =>
      (e.from === fromId && e.to === toId) ||
      (e.from === toId   && e.to === fromId)
    );
  }

  /* ── Graph representations ───────────────────────────────────────────────── */
  function adjacencyMatrix() {
    const n   = nodes.length;
    const mat = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const e of edges) {
      const i = nodes.findIndex(nd => nd.id === e.from);
      const j = nodes.findIndex(nd => nd.id === e.to);
      if (i < 0 || j < 0) continue;
      mat[i][j] = e.weight;
      mat[j][i] = e.weight;
    }
    return mat;
  }

  function adjacencyList() {
    const map = new Map();
    for (const n of nodes) map.set(n.id, []);
    for (const e of edges) {
      map.get(e.from).push({ nodeId: e.to,   weight: e.weight });
      map.get(e.to  ).push({ nodeId: e.from, weight: e.weight });
    }
    return map;
  }

  /* ── Mutations ───────────────────────────────────────────────────────────── */

  function addNode(name, x, y) {
    const hint = document.getElementById('node-hint');
    name = name.trim();
    if (!name)                 { hint.textContent = 'Name is required.';       return false; }
    if (nodeByName(name))      { hint.textContent = `"${name}" already exists.`; return false; }
    if (x < 0 || x > WORLD_W) { hint.textContent = `X must be 0–${WORLD_W}.`; return false; }
    if (y < 0 || y > WORLD_H) { hint.textContent = `Y must be 0–${WORLD_H}.`; return false; }
    hint.textContent = '';
    nodes.push({ id: ++_nid, name, x, y });
    window.Plane.ui.refreshAll();
    return true;
  }

  function removeNode(id) {
    nodes = nodes.filter(n => n.id !== id);
    edges = edges.filter(e => e.from !== id && e.to !== id);
    window.Plane.ui.refreshAll();
  }

  function addEdge(fromId, toId, weight) {
    const hint = document.getElementById('edge-hint');
    fromId = parseInt(fromId);
    toId   = parseInt(toId);
    weight = parseFloat(weight);
    if (!fromId || !toId)          { hint.textContent = 'Select both nodes.';     return false; }
    if (fromId === toId)           { hint.textContent = 'Self-loops not allowed.'; return false; }
    if (isNaN(weight))             { hint.textContent = 'Invalid weight.';         return false; }
    if (edgeExists(fromId, toId))  { hint.textContent = 'Edge already exists.';   return false; }
    hint.textContent = '';
    edges.push({ id: ++_eid, from: fromId, to: toId, weight });
    window.Plane.ui.refreshAll();
    return true;
  }

  function removeEdge(id) {
    edges = edges.filter(e => e.id !== id);
    window.Plane.ui.refreshAll();
  }

  /* Exposes mutable refs so PlaneMatrix can push weight changes directly */
  function _pushEdge(edge) { edges.push(edge); }
  function _filterEdges(predicate) { edges = edges.filter(predicate); }
  function _nextEid() { return ++_eid; }

  function clear() {
    nodes = []; edges = []; _nid = 0; _eid = 0;
  }

  /* ── Attach to namespace ─────────────────────────────────────────────────── */
  window.Plane.graph = {
    getNodes:        () => [...nodes],
    getEdges:        () => [...edges],
    adjacencyMatrix,
    adjacencyList,
    nodeById,
    nodeByName,
    edgeExists,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    clear,
    /* internal helpers for PlaneMatrix weight edits */
    _pushEdge,
    _filterEdges,
    _nextEid,
  };

})();
