# Web3 Market Terminal — isolated test specification

Status: development only. This branch is NOT approved for production deployment.

## Scope
A separate terminal for BTC/USD, ETH/USD and SOL/USD, with 24h change, 24h high/low, volume, source, UTC quote timestamp and freshness status. No other markets.

## Chart
Candlesticks with selectable 5m, 15m, 1h, 4h, 1d intervals. Toggle SMA 50, SMA 200, EMA 20, RSI(14), MACD(12,26,9). Manual Fibonacci retracement from two chosen candle extrema; optional algorithmic swing-high/swing-low Fibonacci with editable anchors. Display indicator warm-up state rather than invented values.

## Market data contract
A server-side adapter normalizes exchange symbols to BTC/USD, ETH/USD and SOL/USD. Every quote has price, base, quote, venue, timestamp, retrieval time and freshness state. Do not mix USD with EUR/USDT. Reject zero, negative, non-finite or malformed prices; reject stale timestamps. Compare backup feeds only when quote currency and timestamps are compatible. Disagreement beyond configured tolerance raises a warning; do not silently overwrite. Historical candles must be sorted, unique and checked for valid OHLCV values. Source-specific rate limits and errors must not crash the UI.

## Failure behavior
On outage, show clearly labeled last-known price with its timestamp or 'Data unavailable'; never represent cached data as live. Chart and indicators fail independently; other portfolio labs remain unaffected. Log structured error codes without exposing credentials.

## Production acceptance gates
1. Verify quotes against the upstream source for all three assets across multiple sessions.
2. Validate SMA/EMA/RSI/MACD against independently calculated fixtures, including short-history and missing-candle cases.
3. Validate manual and automatic Fibonacci anchors and drawing interactions on mobile and desktop.
4. Simulate rate limits, malformed payloads, missing candles, stale data and network disconnects.
5. Run build, type-check, lint and automated tests; smoke-test on iPhone and desktop.
6. Obtain explicit owner approval before merging into main or enabling public routing.

The existing production site, menu structure and labs must not be changed as part of this planning commit.
