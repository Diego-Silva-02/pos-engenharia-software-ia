# Incident report: `/students/db-leaky-connections`

**Window:** 2026-11-24 18:50:27–19:05:27 (-03) / 21:50:27–22:05:27 UTC  
**Service:** `alumnus_app_b337`

## Prometheus

| Result | Finding |
|---|---|
| HTTP 500s | Approximately 446.3 requests in 15 minutes (`increase` estimate) |
| HTTP 200s | 0 observed for this route in the window |
| Failure rate | Sustained at roughly 28–30 failures/minute |
| Failure latency | Mean approximately 1,013 ms; per-minute mean stayed around 1,013–1,017 ms |

The failure latency closely matches the configured 1,000 ms connection-acquisition timeout.

## Loki

About 448–449 matching `Error processing request` error events appeared across the window. The returned error rows repeat the same core message and stack; some include additional Node timer frames. The log message itself is generic, and the Loki stream exposes only `service_name` as a label, so filtering the raw line by endpoint returns no results. Endpoint attribution comes from the stack and matching Tempo trace.

**Error:** `timeout exceeded when trying to connect`

**Representative stack:**

```text
Error: timeout exceeded when trying to connect
    at ...\node_modules\pg-pool\index.js:45:11
    at async DbLeakyConnectionsScenario.createConnection (.../main.ts:52:20)
    at async Object.<anonymous> (.../main.ts:84:24)
```

Loki log trace ID `595bcbd8da8c1db247031b892ec94566` directly correlates with the Tempo trace below.

## Tempo

TraceQL returned 20 matching error traces in the window. The correlated trace above shows:

```text
GET client span (undici)                         1005.6 ms, ERROR
└─ GET /students/db-leaky-connections (server)  1004.0 ms, ERROR
   └─ Fastify request                            1002.6 ms
      └─ Fastify route handler                   1002.9 ms, ERROR
```

The handler span records an `exception` event with `Error: timeout exceeded when trying to connect`. There is no database query span in this failed trace: the request fails while waiting for a pooled connection, before the query runs. The trace also shows no connection-release operation.

## Diagnosis

The connection pool is configured for only two connections. Successful requests acquire clients but do not release them after querying. Once both connections are held, subsequent calls to `pool.connect()` wait for the one-second timeout and reject; the handler catches that error and returns HTTP 500.

The leak is in the route handler’s missing cleanup after the query in [`main.ts`, line 90](../src/scenarios/db-leaky-connections/main.ts#L90). The acquisition is at [line 84](../src/scenarios/db-leaky-connections/main.ts#L84), and the underlying `pool.connect()` timeout occurs at [line 52](../src/scenarios/db-leaky-connections/main.ts#L52). Release the client in a `finally` block so it is returned to the pool on both success and failure.

| Signal | Evidence | Correlation |
|---|---|---|
| Prometheus | ~446 500s; ~1.013 s mean; no 200s | Sustained failures at the pool timeout |
| Loki | ~448–449 repeated timeout errors | Stack points to `pool.connect()` and the endpoint handler |
| Tempo | Error spans; exception matches Loki; ~1.0 s trace | Fails before DB query; no release operation |
| Source | Acquired client is not released after query | Pool exhausts, then subsequent requests time out |
