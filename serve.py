#!/usr/bin/env python3
"""Fund Flow Dashboard – dev server.

HTTP Routes
-----------
GET /api/quotes             current quotes for all ETFs
GET /api/history            ?symbol=XLK&period=1y
GET /api/sectors            ?period=1d
GET /api/backtest           ?weights=XLK:30,SMH:20&period=3y
GET /api/macro              ?period=1d
GET /api/strategy-backtest  ?period=1y&top_n=3
GET /api/chips              ?period=1m
GET /api/events
GET /api/flow-matrix        ?period=1m
GET /api/cycle
Everything else is served as a static file.
"""

from __future__ import annotations

import argparse
import http.server
import json
import socket
import sys
import urllib.parse
from functools import partial
from pathlib import Path

from data_engine import (
    ETF_UNIVERSE,
    MOCK_EVENTS,
    PERIOD_DAYS,
    generate_series,
    get_all_quotes,
    get_chips_data,
    get_cycle_data,
    get_flow_matrix,
    get_macro_data,
    run_backtest,
    run_strategy_backtest,
)


class _Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api(parsed)
        else:
            super().do_GET()

    def _json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _handle_api(self, parsed: urllib.parse.ParseResult) -> None:
        qs   = urllib.parse.parse_qs(parsed.query)
        path = parsed.path

        try:
            if path == "/api/quotes":
                self._json(get_all_quotes())

            elif path == "/api/history":
                sym    = qs.get("symbol", ["SPY"])[0].upper()
                period = qs.get("period",  ["1y"])[0]
                if sym not in ETF_UNIVERSE:
                    self._json({"error": "unknown symbol"}, 400)
                    return
                series = generate_series(sym, PERIOD_DAYS.get(period, 380))
                self._json({"symbol": sym, "period": period, "series": series})

            elif path == "/api/sectors":
                period  = qs.get("period", ["1d"])[0]
                key     = f"change_{period}"
                sectors: dict[str, dict] = {}
                for q in get_all_quotes():
                    sec = q["sector"]
                    if sec not in sectors:
                        sectors[sec] = {"sector": sec, "change": 0.0, "mcap": 0, "etfs": []}
                    sectors[sec]["etfs"].append({"symbol": q["symbol"], "change": q.get(key, 0)})
                    sectors[sec]["mcap"] += q["mcap"]
                for sec, data in sectors.items():
                    total_m = sum(ETF_UNIVERSE[e["symbol"]]["mcap"] for e in data["etfs"])
                    data["change"] = round(
                        sum(e["change"] * ETF_UNIVERSE[e["symbol"]]["mcap"] for e in data["etfs"]) / total_m, 2
                    ) if total_m else 0
                self._json(list(sectors.values()))

            elif path == "/api/backtest":
                raw_w  = qs.get("weights", ["SPY:1"])[0]
                period = qs.get("period",  ["1y"])[0]
                weights: dict[str, float] = {}
                for part in raw_w.split(","):
                    if ":" in part:
                        s, w = part.split(":", 1)
                        s = s.strip().upper()
                        if s in ETF_UNIVERSE:
                            weights[s] = float(w) / 100
                if not weights:
                    self._json({"error": "no valid weights"}, 400)
                    return
                total = sum(weights.values())
                weights = {s: w / total for s, w in weights.items()}
                self._json(run_backtest(weights, period))

            elif path == "/api/macro":
                self._json(get_macro_data(qs.get("period", ["1d"])[0]))

            elif path == "/api/strategy-backtest":
                self._json(run_strategy_backtest(
                    period=qs.get("period", ["1y"])[0],
                    top_n=int(qs.get("top_n", ["3"])[0]),
                ))

            elif path == "/api/chips":
                self._json(get_chips_data(qs.get("period", ["1m"])[0]))

            elif path == "/api/events":
                self._json(MOCK_EVENTS)

            elif path == "/api/flow-matrix":
                self._json(get_flow_matrix(qs.get("period", ["1m"])[0]))

            elif path == "/api/cycle":
                self._json(get_cycle_data())

            else:
                self._json({"error": "not found"}, 404)

        except Exception as exc:
            self._json({"error": str(exc)}, 500)


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fund Flow Dashboard dev server")
    p.add_argument("--host",      default="0.0.0.0")
    p.add_argument("--port",      type=int, default=8000)
    p.add_argument("--directory", default=str(Path(__file__).resolve().parent))
    return p.parse_args()


def _local_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def main() -> None:
    args      = _parse_args()
    directory = str(Path(args.directory).resolve())
    handler   = partial(_Handler, directory=directory)

    try:
        server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as exc:
        print(f"Cannot bind {args.host}:{args.port}: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    print(f"Fund Flow Dashboard → http://localhost:{args.port}")
    if args.host == "0.0.0.0":
        ip = _local_ip()
        if ip:
            print(f"Network             → http://{ip}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
