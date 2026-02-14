"""
Metrics computation from query logs.

Usage (from backend/):
    python -m utils.metrics_report
    python -m utils.metrics_report --ground-truth ground_truth.json
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from utils.logging_utils import read_logs
from utils.settings import LOG_FILE


# ---------------------------------------------------------------------------
# Average latency
# ---------------------------------------------------------------------------

def compute_average_latency(
    log_file: Optional[str] = None,
) -> Dict[str, Optional[float]]:
    """
    Return average retrieval, generation, and total latency (ms)
    across all successful queries in the log.
    """
    entries = _load(log_file)

    ret_vals: List[float] = []
    gen_vals: List[float] = []
    tot_vals: List[float] = []

    for e in entries:
        if not e.get("success"):
            continue
        if e.get("retrieval_latency_ms") is not None:
            ret_vals.append(e["retrieval_latency_ms"])
        if e.get("generation_latency_ms") is not None:
            gen_vals.append(e["generation_latency_ms"])
        if e.get("total_latency_ms") is not None:
            tot_vals.append(e["total_latency_ms"])

    return {
        "avg_retrieval_latency_ms": _mean(ret_vals),
        "avg_generation_latency_ms": _mean(gen_vals),
        "avg_total_latency_ms": _mean(tot_vals),
        "total_queries": len(entries),
        "successful_queries": sum(1 for e in entries if e.get("success")),
    }


# ---------------------------------------------------------------------------
# Precision@K
# ---------------------------------------------------------------------------

def compute_precision_at_k(
    log_file: Optional[str] = None,
    ground_truth_json: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare retrieved pages against a ground-truth file.

    Ground truth format (JSON):
    {
      "queries": [
        { "query": "...", "expected_pages": [3, 5] }
      ]
    }

    Returns per-query and macro-average precision@K.
    """
    if ground_truth_json is None:
        return {"error": "No ground_truth_json provided."}

    gt_path = Path(ground_truth_json)
    if not gt_path.exists():
        return {"error": f"Ground truth file not found: {gt_path}"}

    with open(gt_path, "r", encoding="utf-8") as f:
        gt = json.load(f)

    # Build expected map: query text → set of expected pages
    expected_map: Dict[str, set] = {}
    for item in gt.get("queries", []):
        expected_map[item["query"].lower().strip()] = set(item["expected_pages"])

    entries = _load(log_file)

    results: List[Dict[str, Any]] = []
    for e in entries:
        if e.get("mode") != "rag" or not e.get("success"):
            continue
        q = e["query"].lower().strip()
        if q not in expected_map:
            continue

        expected_pages = expected_map[q]

        # Derive retrieved pages from chunk metadata (if available)
        chunk_ids = e.get("retrieved_chunk_ids") or []
        # chunk_ids don't contain page info directly; we rely on scores
        # For a proper evaluation, you'd look up chunk→page mapping.
        # Here we do a simplified version using the scores list length.
        retrieved_count = len(chunk_ids)
        # Placeholder: actual precision requires page→chunk mapping.
        # In a full system, log the retrieved pages explicitly.
        results.append({
            "query": e["query"],
            "retrieved_chunks": retrieved_count,
            "expected_pages": list(expected_pages),
            "note": "Full precision requires page-level retrieval logging.",
        })

    return {
        "evaluated_queries": len(results),
        "details": results,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load(log_file: Optional[str]) -> List[Dict[str, Any]]:
    if log_file:
        path = Path(log_file)
        if not path.exists():
            return []
        entries: List[Dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if s:
                    entries.append(json.loads(s))
        return entries
    return read_logs()


def _mean(vals: List[float]) -> Optional[float]:
    return round(sum(vals) / len(vals), 2) if vals else None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    gt = None
    for i, arg in enumerate(sys.argv):
        if arg == "--ground-truth" and i + 1 < len(sys.argv):
            gt = sys.argv[i + 1]

    print("\n=== Average Latency ===")
    latency = compute_average_latency()
    for k, v in latency.items():
        print(f"  {k}: {v}")

    if gt:
        print("\n=== Precision@K ===")
        prec = compute_precision_at_k(ground_truth_json=gt)
        print(json.dumps(prec, indent=2))

    print()
