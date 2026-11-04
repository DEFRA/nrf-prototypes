#!/usr/bin/env bash
# PreToolUse guard: work goes into the latest version of a journey.
#
# Content journeys come in versions of a family (nrf-quote-7 and
# nrf-quote-7-1, nrf-request-to-use-1 and nrf-request-to-use-1-1), read from
# the `homepage:` block of each content/<id>/journey.yaml. A tool call that
# would change a file under content/<id>/ when a newer version of the same
# family exists becomes a permission prompt naming the latest, so an older
# version is only edited when the user asked for it.
#
# Stdin: the hook JSON ({ tool_name, tool_input }). Stdout: hook JSON or nothing.

set -euo pipefail

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# The family or version line of a journey's homepage block
homepage_field() {
  awk -v field="$2" '
    /^homepage:/ { inside = 1; next }
    inside && /^[^[:space:]#]/ { exit }
    inside && $1 == field ":" { gsub(/["'\'']/, "", $2); print $2; exit }
  ' "$root/content/$1/journey.yaml" 2>/dev/null
}

# The journey ids under content/ that a path or command mentions
journeys_in() {
  printf '%s' "$1" | grep -Eo '(^|[^[:alnum:]_-])content/[a-z0-9-]+/' |
    sed -E 's#^.*content/([a-z0-9-]+)/$#\1#' | sort -u
}

# The newest journey in the same family as $1, when it is not $1 itself
newer_version() {
  local id="$1" family version
  family=$(homepage_field "$id" family)
  version=$(homepage_field "$id" version)
  [[ -n "$family" && -n "$version" ]] || return 0
  local latest_id="$id" latest_version="$version" other other_version
  for yaml in "$root"/content/*/journey.yaml; do
    other=$(basename "$(dirname "$yaml")")
    [[ "$other" == "$id" ]] && continue
    [[ "$(homepage_field "$other" family)" == "$family" ]] || continue
    other_version=$(homepage_field "$other" version)
    if [[ "$(printf '%s\n%s\n' "$latest_version" "$other_version" | sort -V | tail -n1)" == "$other_version" && "$other_version" != "$latest_version" ]]; then
      latest_id="$other"
      latest_version="$other_version"
    fi
  done
  [[ "$latest_id" != "$id" ]] && printf '%s %s %s\n' "$version" "$latest_id" "$latest_version"
  return 0
}

check() {
  local id found
  for id in $(journeys_in "$1"); do
    found=$(newer_version "$id")
    if [[ -n "$found" ]]; then
      read -r version latest_id latest_version <<<"$found"
      jq -n --arg id "$id" --arg v "$version" --arg latest "$latest_id" --arg lv "$latest_version" '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: ("Latest version guard: \($id) is version \($v), but \($latest) (version \($lv)) is the latest of this journey. Edit \($latest) unless the user explicitly asked for \($id); check the URL or screen-wall in their message.")
        }
      }'
      return 0
    fi
  done
}

case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
    [[ -n "$path" ]] && check "$path"
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
    # Commands that can write, including scripts that open files themselves
    mutating='(>|\bsed[[:space:]]+-[a-zA-Z]*i|\bperl[[:space:]]+-[a-zA-Z]*i|\bmv\b|\bcp\b|\brm\b|\btee\b|\btruncate\b|\bgit[[:space:]]+(checkout|restore|revert|reset|stash|apply|cherry-pick)\b|\bpatch\b|\bpython3?\b|\bnode\b|\bopen\(|writeFile)'
    if printf '%s' "$cmd" | grep -Eq "$mutating"; then
      check "$cmd"
    fi
    ;;
esac

exit 0
