#!/usr/bin/env python3
"""
Generate a Bloom filter of all HN-submitted URLs.

Queries BigQuery public dataset, normalizes URLs, and outputs a binary
Bloom filter file (bloom.bin) for use by the Discussed browser extension.

Binary format:
  [4 bytes] num_hashes (uint32 LE)
  [4 bytes] num_bits   (uint32 LE)
  [...]     bit array  (ceil(num_bits / 8) bytes)

Usage:
  pip install google-cloud-bigquery bitarray
  python generate-bloom.py [--output bloom.bin]
"""

import argparse
import math
import struct
import sys
from urllib.parse import urlparse, urlunparse

from bitarray import bitarray
from google.cloud import bigquery

# Bloom filter parameters
# For ~2.5M URLs, 0.1% false positive rate:
#   m = -n * ln(p) / (ln(2))^2 ≈ 36M bits ≈ 4.5MB
#   k = (m/n) * ln(2) ≈ 10
NUM_HASHES = 10
NUM_BITS = 36_000_000

BIGQUERY_QUERY = """
SELECT DISTINCT url
FROM `bigquery-public-data.hacker_news.full`
WHERE url IS NOT NULL
  AND url != ''
  AND type = 'story'
"""


def normalize_url(raw: str) -> str | None:
    """Normalize a URL using the same rules as the extension."""
    try:
        parsed = urlparse(raw)
    except Exception:
        return None

    if parsed.scheme not in ("http", "https"):
        return None

    # Upgrade to https
    scheme = "https"

    # Remove www prefix, lowercase hostname
    hostname = parsed.hostname
    if not hostname:
        return None
    hostname = hostname.lower()
    if hostname.startswith("www."):
        hostname = hostname[4:]

    # YouTube special handling
    if hostname in ("youtube.com", "m.youtube.com"):
        if parsed.path == "/watch":
            from urllib.parse import parse_qs

            params = parse_qs(parsed.query)
            video_id = params.get("v", [None])[0]
            if video_id:
                return f"https://youtube.com/watch?v={video_id}"
        match_embed = parsed.path.startswith("/embed/")
        if match_embed:
            video_id = parsed.path.split("/")[2] if len(parsed.path.split("/")) > 2 else None
            if video_id:
                return f"https://youtube.com/watch?v={video_id}"
    elif hostname == "youtu.be":
        video_id = parsed.path.lstrip("/")
        if video_id:
            return f"https://youtube.com/watch?v={video_id}"

    # Remove query string and fragment
    # Remove trailing slash (but keep root /)
    path = parsed.path or "/"
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    # Reconstruct with port if present
    port = parsed.port
    netloc = f"{hostname}:{port}" if port and port not in (80, 443) else hostname

    return urlunparse((scheme, netloc, path, "", "", ""))


def fnv1a(data: bytes, seed: int) -> int:
    """FNV-1a hash matching the extension's JS implementation."""
    hash_val = 2166136261 ^ seed
    for byte in data:
        hash_val ^= byte
        hash_val = (hash_val * 16777619) & 0xFFFFFFFF
    return hash_val


def bloom_add(bits: bitarray, value: str, num_hashes: int, num_bits: int):
    encoded = value.encode("utf-8")
    for i in range(num_hashes):
        h = fnv1a(encoded, i)
        bits[h % num_bits] = 1


def main():
    parser = argparse.ArgumentParser(description="Generate Bloom filter for HN URLs")
    parser.add_argument("--output", default="bloom.bin", help="Output file path")
    args = parser.parse_args()

    print("Querying BigQuery for HN URLs...")
    client = bigquery.Client()
    query_job = client.query(BIGQUERY_QUERY)
    rows = list(query_job.result())
    print(f"  Fetched {len(rows)} URLs")

    print("Normalizing URLs...")
    normalized = set()
    skipped = 0
    for row in rows:
        result = normalize_url(row.url)
        if result:
            normalized.add(result)
        else:
            skipped += 1
    print(f"  {len(normalized)} unique normalized URLs ({skipped} skipped)")

    print(f"Building Bloom filter (bits={NUM_BITS}, hashes={NUM_HASHES})...")
    bits = bitarray(NUM_BITS)
    bits.setall(0)
    for url in normalized:
        bloom_add(bits, url, NUM_HASHES, NUM_BITS)

    fill_rate = bits.count() / NUM_BITS
    theoretical_fpr = fill_rate**NUM_HASHES
    print(f"  Fill rate: {fill_rate:.2%}")
    print(f"  Theoretical false positive rate: {theoretical_fpr:.4%}")

    print(f"Writing {args.output}...")
    with open(args.output, "wb") as f:
        f.write(struct.pack("<II", NUM_HASHES, NUM_BITS))
        f.write(bits.tobytes())

    file_size = 8 + math.ceil(NUM_BITS / 8)
    print(f"  Size: {file_size / 1024 / 1024:.1f} MB")
    print("Done!")


if __name__ == "__main__":
    main()
