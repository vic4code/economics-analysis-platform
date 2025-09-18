#!/usr/bin/env python3
"""Simple development server for the Global Market Dashboard.

This script wraps Python's built-in HTTP server so you can preview the
static dashboard locally or on other devices connected to the same network.
"""

from __future__ import annotations

import argparse
import http.server
import socket
import sys
from functools import partial
from pathlib import Path


def parse_args() -> argparse.Namespace:
    """Parse command line options for the development server."""
    default_directory = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(
        description=(
            "Serve the Global Market Dashboard with Python's built-in "
            "HTTP server so it can be viewed locally or from another device."
        )
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help=(
            "Interface to bind. Use 0.0.0.0 to allow other devices on the "
            "same network to connect (default: %(default)s)."
        ),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to listen on (default: %(default)s).",
    )
    parser.add_argument(
        "--directory",
        default=str(default_directory),
        help="Directory to serve (default: repository root).",
    )

    return parser.parse_args()


def detect_local_ip() -> str | None:
    """Return the local network IP address if one can be determined."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return None


def main() -> None:
    args = parse_args()
    directory = Path(args.directory).resolve()
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))

    try:
        server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    except OSError as exc:
        print(
            f"Failed to start server on {args.host}:{args.port}: {exc}",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    print(f"Serving {directory} at:")

    if args.host == "0.0.0.0":
        print(f"  Local:   http://localhost:{args.port}")
        local_ip = detect_local_ip()
        if local_ip:
            print(f"  Network: http://{local_ip}:{args.port} (use this on your phone)")
        else:
            print("  Network: Unable to detect local IP automatically.")
    else:
        print(f"  URL:     http://{args.host}:{args.port}")

    print("Press Ctrl+C to stop the server.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
