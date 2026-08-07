# Figma token setup

The `figma-journey` skill talks to the Figma REST API and needs a **read-only** personal access token
on the environment as `FIGMA_TOKEN`. Reading file content is all it does — it never writes to Figma —
so a read-only token is sufficient and preferred.

## 1. Generate a personal access token

1. Sign in at [figma.com](https://www.figma.com).
2. Open **Settings** (top-left menu → your account) → **Security** tab.
3. Under **Personal access tokens**, click **Generate new token**.
4. Give it a name (e.g. `bng-figma-journey`).
5. **Scopes** — for a scoped token, grant **File content: Read-only**. (A classic full-access token
   also works, but read-only is all this skill needs — prefer it.)
6. Click **Generate token** and copy the value **now** — Figma shows it only once.

## 2. Export it in your shell

Add the token to `~/.zshrc` (or your shell's rc file) so every session has it:

```sh
export FIGMA_TOKEN="figd_your_token_value_here"
```

Then reload the current shell:

```sh
source ~/.zshrc
```

The token is a secret — keep it out of the repo, out of commits, and never print or echo it. The
skill's scripts read `process.env.FIGMA_TOKEN` and never log its value.

## 3. Verify it works

Two checks — both should print `200`:

```sh
# a) token is valid
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Figma-Token: $FIGMA_TOKEN" https://api.figma.com/v1/me

# b) token can read the example file's content
curl -s -o /dev/null -w "%{http_code}\n" -H "X-Figma-Token: $FIGMA_TOKEN" \
  https://api.figma.com/v1/files/MCZmgs6nNcuhXT00u5i9At
```

Quick length check (prints a non-zero number if the token is set — never prints the token):

```sh
printf '%s' "${FIGMA_TOKEN:-}" | wc -c
```

## Troubleshooting

| HTTP  | Meaning           | Fix                                                                                                                                  |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `200` | OK                | You're good.                                                                                                                         |
| `401` | Unauthorized      | Token is missing, mistyped, or expired. Re-generate and re-export it.                                                                |
| `403` | Forbidden         | Token lacks **File content: Read-only** scope, or your org blocks token access to that file. Re-issue with the scope / ask an admin. |
| `404` | Not found         | Wrong `fileKey`. Re-copy it from the Figma URL (`figma.com/proto/<fileKey>?...`).                                                    |
| `429` | Too many requests | Rate limited. Wait a moment and retry; avoid tight loops.                                                                            |

## Token validation note

The maintainer's current `FIGMA_TOKEN` was validated on **2026-07-03**: `HTTP 200` on
`GET /v1/me` and on the example file `GET /v1/files/MCZmgs6nNcuhXT00u5i9At` (fileKey
`MCZmgs6nNcuhXT00u5i9At`, the example prototype used to develop this skill).