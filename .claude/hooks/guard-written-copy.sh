#!/usr/bin/env bash
# PreToolUse guard: written copy is owned by the content designer.
#
# Any tool call that would change a markdown copy file under content/ or
# prompts/ is turned into a permission prompt ("ask"), even in acceptEdits or
# auto mode, so the change cannot land without the user approving that
# specific diff. Everything else passes through untouched.
#
# Stdin: the hook JSON ({ tool_name, tool_input }). Stdout: hook JSON or nothing.

set -euo pipefail

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')

# Paths that count as written copy (relative to the repo root).
copy_regex='(^|/)(content|prompts)/[^[:space:]]*\.md$'

reason() {
  local path="$1"
  jq -n --arg path "$path" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: ("Written copy guard: \($path) is content-designer copy. Do not change wording, options, hints, errors or button text unless the user has explicitly asked for that change in this conversation. Approve only if they did.")
    }
  }'
}

case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
    if [[ -n "$path" ]] && printf '%s' "$path" | grep -Eq "$copy_regex"; then
      reason "$path"
    fi
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
    # Only shell commands that can write: redirects, in-place edits, moves,
    # copies, deletes, tee, or git commands that rewrite the working tree.
    mutating='(>|>>|\bsed[[:space:]]+-[a-zA-Z]*i|\bperl[[:space:]]+-[a-zA-Z]*i|\bmv\b|\bcp\b|\brm\b|\btee\b|\btruncate\b|\bgit[[:space:]]+(checkout|restore|revert|reset|stash|apply|cherry-pick)\b|\bpatch\b)'
    if printf '%s' "$cmd" | grep -Eq "$mutating"; then
      path=$(printf '%s' "$cmd" | grep -Eo '(^|[[:space:]"'"'"'=])[^[:space:]"'"'"']*(content|prompts)/[^[:space:]"'"'"']*\.md' | head -n1 | sed -E 's/^[[:space:]"'"'"'=]//')
      if [[ -n "$path" ]]; then
        reason "$path"
      fi
    fi
    ;;
esac

exit 0
