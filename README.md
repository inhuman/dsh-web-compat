# dsh-web-compat

Two compatibility shims for DeepSeek Harness Web, for the case where the app is served over plain HTTP on a LAN address and some plugins were built against a released DSH line rather than the source checkout you run.

## What it fixes

| Symptom | Cause | Shim |
|---|---|---|
| Clicking a third-party tab card (Side Chat, Terminal, …) does nothing; console shows `TypeError: crypto.randomUUID is not a function` | `crypto.randomUUID` is a secure-context API. It exists on `http://localhost` and `http://127.0.0.1`, and is `undefined` on `http://192.168.x.x`. | The client half defines `randomUUID` from `crypto.getRandomValues`, which insecure origins do expose. Native implementations are left untouched. |
| Every route of a `/sidebar` plugin answers a bare `400`; its UI renders but stays empty | The plugin fences its routes with `ctx.connection.requestRejection()`, which the source checkout replaced with `admit()`. | The host half defines `requestRejection` as the released wrapper over `admit()`. Nothing is defined when the method already exists. |

Neither shim changes the app URL, the browser, or the Harness checkout.

## Install

```sh
dsh plugin --profile web add github:inhuman/dsh-web-compat
```

Then hard-refresh the browser (Cmd/Ctrl+Shift+R) and, because the host half runs at startup, restart `dsh web` once.

## Alternative: serve over HTTPS

Both issues disappear on a secure origin. `dsh web` accepts a certificate and key:

```sh
dsh web --host 192.168.1.248 --port 3080 --tls-cert ./server-chain.pem --tls-key ./server-key.pem
```

The cost is a self-signed certificate warning in every browser that opens the app.

## Requirements

Tested on DSH Web `0.2.2-rc.4`.

## Removal

Uninstall the bundle (`dsh plugin --profile web remove @inhuman/dsh-web-compat`) once the plugins you use no longer need either shim.

## License

MIT
