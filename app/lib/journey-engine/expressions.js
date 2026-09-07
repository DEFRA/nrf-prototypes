/**
 * Journey engine: condition evaluation
 *
 * Conditions are plain YAML objects, never strings, so nothing is parsed or
 * evaluated as code. A condition has one `key` (a dotted path into session
 * data, or a `$name` engine value) plus one or more operators. Multiple
 * operators on one condition are ANDed. `all`, `any` and `not` combine
 * conditions.
 *
 *   { key: planningType, equals: Other }
 *   { key: residentialBuildingCount, gt: 15000, lt: 20000 }
 *   { any: [{ key: a, truthy: true }, { key: b, isSet: true }] }
 */

const OPERATORS = [
  'equals',
  'notEquals',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'truthy',
  'falsy',
  'isSet'
]

const COMBINATORS = ['all', 'any', 'not']

function getPath(obj, dotted) {
  if (!obj || !dotted) {
    return undefined
  }
  return String(dotted)
    .split('.')
    .reduce((acc, part) => {
      if (acc === undefined || acc === null) {
        return undefined
      }
      return acc[part]
    }, obj)
}

function resolveKey(key, ctx) {
  if (typeof key === 'string' && key.startsWith('$')) {
    return ctx[key.slice(1)]
  }
  return getPath(ctx.data || {}, key)
}

function isSet(value) {
  return value !== undefined && value !== null && value !== ''
}

function isTruthy(value) {
  if (!isSet(value)) {
    return false
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return true
}

function looseEquals(a, b) {
  if (typeof a === typeof b) {
    return a === b
  }
  return String(a) === String(b)
}

function toNumber(value) {
  if (typeof value === 'number') {
    return value
  }
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

function compareNumber(value, expected, test) {
  const actual = toNumber(value)
  if (actual === null) {
    return false
  }
  return test(actual, toNumber(expected))
}

function evaluate(condition, ctx) {
  if (condition === undefined || condition === null || condition === true) {
    return true
  }
  if (condition === false) {
    return false
  }
  if (Array.isArray(condition.all)) {
    return condition.all.every((c) => evaluate(c, ctx))
  }
  if (Array.isArray(condition.any)) {
    return condition.any.some((c) => evaluate(c, ctx))
  }
  if (condition.not !== undefined) {
    return !evaluate(condition.not, ctx)
  }

  const value = resolveKey(condition.key, ctx)

  for (const op of Object.keys(condition)) {
    if (op === 'key' || !OPERATORS.includes(op)) {
      continue
    }
    const expected = condition[op]
    let pass = true
    if (op === 'equals') {
      pass = looseEquals(value, expected)
    } else if (op === 'notEquals') {
      pass = !looseEquals(value, expected)
    } else if (op === 'in') {
      pass = [].concat(expected).some((e) => looseEquals(value, e))
    } else if (op === 'notIn') {
      pass = ![].concat(expected).some((e) => looseEquals(value, e))
    } else if (op === 'gt') {
      pass = compareNumber(value, expected, (a, b) => a > b)
    } else if (op === 'gte') {
      pass = compareNumber(value, expected, (a, b) => a >= b)
    } else if (op === 'lt') {
      pass = compareNumber(value, expected, (a, b) => a < b)
    } else if (op === 'lte') {
      pass = compareNumber(value, expected, (a, b) => a <= b)
    } else if (op === 'between') {
      pass = compareNumber(
        value,
        null,
        (a) => a >= toNumber(expected[0]) && a <= toNumber(expected[1])
      )
    } else if (op === 'truthy') {
      pass = isTruthy(value) === Boolean(expected)
    } else if (op === 'falsy') {
      pass = !isTruthy(value) === Boolean(expected)
    } else if (op === 'isSet') {
      pass = isSet(value) === Boolean(expected)
    }
    if (!pass) {
      return false
    }
  }
  return true
}

/**
 * Returns the first rule whose `when` passes. Rules without `when` always
 * match, so a trailing default rule is the fallback.
 */
function firstMatch(rules, ctx) {
  if (!Array.isArray(rules)) {
    return undefined
  }
  return rules.find((rule) => !rule.when || evaluate(rule.when, ctx))
}

/**
 * Validates the shape of a condition. Returns a list of problems.
 */
function validateCondition(condition, where) {
  const problems = []
  if (condition === undefined || condition === null) {
    return problems
  }
  if (typeof condition !== 'object') {
    problems.push(`${where}: condition must be an object`)
    return problems
  }
  for (const comb of COMBINATORS) {
    if (condition[comb] !== undefined) {
      const list = comb === 'not' ? [condition[comb]] : condition[comb]
      if (!Array.isArray(list)) {
        problems.push(`${where}: '${comb}' must be a list`)
        return problems
      }
      list.forEach((c, i) =>
        problems.push(...validateCondition(c, `${where}.${comb}[${i}]`))
      )
      return problems
    }
  }
  if (!condition.key) {
    problems.push(`${where}: condition needs a 'key'`)
  }
  const ops = Object.keys(condition).filter((k) => k !== 'key')
  if (ops.length === 0) {
    problems.push(`${where}: condition needs an operator`)
  }
  for (const op of ops) {
    if (!OPERATORS.includes(op)) {
      problems.push(
        `${where}: unknown operator '${op}' (expected one of ${OPERATORS.join(', ')})`
      )
    }
  }
  return problems
}

/**
 * Human-readable rendering of a condition, used for flow diagram edge labels.
 */
function describeCondition(condition) {
  if (!condition) {
    return ''
  }
  if (Array.isArray(condition.all)) {
    return condition.all.map(describeCondition).join(' and ')
  }
  if (Array.isArray(condition.any)) {
    return condition.any.map(describeCondition).join(' or ')
  }
  if (condition.not !== undefined) {
    return `not (${describeCondition(condition.not)})`
  }
  const key = String(condition.key).replace(/^\$/, '')
  const parts = []
  const words = {
    equals: 'is',
    notEquals: 'is not',
    in: 'is one of',
    notIn: 'is not one of',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    between: 'between'
  }
  for (const op of Object.keys(condition)) {
    if (op === 'key') {
      continue
    }
    const expected = condition[op]
    if (op === 'truthy') {
      parts.push(expected ? `${key} is true` : `${key} is false`)
    } else if (op === 'falsy') {
      parts.push(expected ? `${key} is false` : `${key} is true`)
    } else if (op === 'isSet') {
      parts.push(expected ? `${key} is set` : `${key} is not set`)
    } else if (op === 'between') {
      parts.push(`${key} between ${expected[0]} and ${expected[1]}`)
    } else if (Array.isArray(expected)) {
      parts.push(`${key} ${words[op]} ${expected.join(', ')}`)
    } else {
      parts.push(`${key} ${words[op]} ${expected}`)
    }
  }
  return parts.join(' and ')
}

module.exports = {
  OPERATORS,
  getPath,
  resolveKey,
  isSet,
  isTruthy,
  evaluate,
  firstMatch,
  validateCondition,
  describeCondition
}
