#!/usr/bin/env node
/**
 * Tags each design handoff in git.
 *
 * Compares every content/<journey>/journey.yaml between two commits and, for
 * each page whose `handoff:` date is new or different, creates the tag
 * handoff/<journey>/<date> on HEAD (one tag per journey per date, shared by
 * the pages stamped together). The Publish workflow runs it on every push
 * to main; QA, BAs and developers then have a fixed reference to the copy
 * as handed over, and `git diff handoff/a handoff/b -- content/` shows what
 * changed between two handoffs.
 *
 *   BEFORE_SHA=<commit> node scripts/handoff-tags.js [--push] [--dry-run]
 *
 * BEFORE_SHA defaults to HEAD~1. --push pushes the new tags to origin.
 * --dry-run only prints what would be tagged.
 */

const { execFileSync } = require('child_process')
const path = require('path')
const yaml = require('js-yaml')
const { tagFor, isHandoffDate } = require('../app/lib/journey-engine/history')

const ROOT = path.join(__dirname, '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const push = args.includes('--push')
const before = process.env.BEFORE_SHA || 'HEAD~1'
const head = process.env.HEAD_SHA || 'HEAD'

function git(gitArgs, options = {}) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', options.quiet ? 'ignore' : 'inherit']
    }).trim()
  } catch (error) {
    if (options.quiet) {
      return null
    }
    throw error
  }
}

function handoffsIn(ref, file) {
  const text = git(['show', `${ref}:${file}`], { quiet: true })
  if (text === null) {
    return {}
  }
  let raw
  try {
    raw = yaml.load(text) || {}
  } catch (error) {
    return {}
  }
  const dates = {}
  for (const page of raw.pages || []) {
    if (!page || !page.id || page.handoff === undefined) {
      continue
    }
    const on =
      page.handoff instanceof Date
        ? page.handoff.toISOString().slice(0, 10)
        : String(page.handoff)
    if (isHandoffDate(on)) {
      dates[page.id] = on
    }
  }
  return dates
}

// The all-zero "before" of a branch's first push has nothing to compare
const beforeUsable =
  !/^0+$/.test(before) &&
  git(['rev-parse', '--verify', `${before}^{commit}`], { quiet: true })
const changedFiles = beforeUsable
  ? git(['diff', '--name-only', before, head, '--', 'content/*/journey.yaml'])
  : git(['ls-files', 'content/*/journey.yaml'])

const wanted = new Set()
for (const file of changedFiles.split('\n').filter(Boolean)) {
  const journeyId = file.split('/')[1]
  const now = handoffsIn(head, file)
  const then = beforeUsable ? handoffsIn(before, file) : {}
  for (const [pageId, on] of Object.entries(now)) {
    if (then[pageId] !== on) {
      wanted.add(tagFor(journeyId, on))
      console.log(`${journeyId}/${pageId}: handed over ${on}`)
    }
  }
}

if (wanted.size === 0) {
  console.log('No new handoffs')
  process.exit(0)
}

const created = []
for (const tag of wanted) {
  if (git(['rev-parse', '--verify', `refs/tags/${tag}`], { quiet: true })) {
    console.log(`${tag} already exists`)
    continue
  }
  if (dryRun) {
    console.log(`would tag ${tag}`)
    continue
  }
  git(['tag', tag, head])
  created.push(tag)
  console.log(`tagged ${tag}`)
}

if (push && created.length) {
  git(['push', 'origin', ...created.map((tag) => `refs/tags/${tag}`)])
  console.log(`pushed ${created.length} tag${created.length === 1 ? '' : 's'}`)
}
