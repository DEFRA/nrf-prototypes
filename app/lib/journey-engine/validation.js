/**
 * Journey engine: server-side validation for question pages
 *
 * Every error message comes from the page's `errors:` frontmatter so the
 * content designer owns the wording. Keys:
 *   required   nothing entered / selected / uploaded
 *   invalid    not a number
 *   whole      not a whole number
 *   min, max   number out of range
 *   format     email in the wrong shape, or not a full UK postcode in a
 *              form field with `autocomplete: postal-code`
 *   tooLong    more characters than a textarea's maxLength
 *   tooLarge   file over the size limit
 *   wrongType  file extension not allowed
 *   empty      zero-byte file
 *   uploadFailed  any other upload problem
 * Missing keys fall back to `required`.
 */

const { validateEmail } = require('../nrf-estimate-3/validators')

function message(page, key, fallback) {
  const errors = (page.content && page.content.errors) || {}
  return errors[key] || errors.required || fallback || 'There is a problem'
}

function fail(page, key, fallback) {
  return { ok: false, error: message(page, key, fallback) }
}

function validateRadios(page, body) {
  const value = body[page.field]
  if (!value) {
    return fail(page, 'required')
  }
  return { ok: true, value }
}

function validateCheckboxes(page, body) {
  let value = body[page.field]
  if (value === undefined) {
    value = []
  }
  value = [].concat(value).filter((v) => v && v !== '_unchecked')
  if (value.length === 0) {
    return fail(page, 'required')
  }
  return { ok: true, value }
}

function validateInput(page, body) {
  const value = String(body[page.field] || '').trim()
  if (!value) {
    return fail(page, 'required')
  }
  return { ok: true, value }
}

// A `type: textarea` page with `optional: true` may be left empty
function validateTextarea(page, body) {
  const value = String(body[page.field] || '').trim()
  if (!value && !page.content.optional) {
    return fail(page, 'required')
  }
  if (page.content.maxLength && value.length > page.content.maxLength) {
    return fail(page, 'tooLong')
  }
  return { ok: true, value }
}

function validateNumber(page, body) {
  const raw = String(body[page.field] || '').trim()
  if (!raw) {
    return fail(page, 'required')
  }
  const value = Number(raw)
  if (Number.isNaN(value)) {
    return fail(page, 'invalid')
  }
  if (!Number.isInteger(value)) {
    return fail(page, 'whole')
  }
  if (page.min !== undefined && value < page.min) {
    return fail(page, 'min')
  }
  if (page.max !== undefined && value > page.max) {
    return fail(page, 'max')
  }
  return { ok: true, value }
}

function validateEmailField(page, body) {
  const value = String(body[page.field] || '').trim()
  const result = validateEmail(value)
  if (!result.valid) {
    const key = value ? 'format' : 'required'
    return fail(page, key, result.error)
  }
  return { ok: true, value }
}

function fieldMessage(field, key) {
  return (
    field.errors[key] ||
    field.errors.required ||
    `Enter ${String(field.label).toLowerCase()}`
  )
}

// A full UK postcode: outward code (A9, A99, A9A, AA9, AA99, AA9A) then
// inward code (9AA), in any case, with or without spaces
const UK_POSTCODE = /^[a-z]{1,2}\d[a-z\d]?\d[a-z]{2}$/i

// Only checked when the field's `errors:` gives the `format` message
function isCheckedPostcode(field) {
  return field.autocomplete === 'postal-code' && field.errors.format
}

// Upper case with one space before the inward code: "sw1a1aa" → "SW1A 1AA"
function formatPostcode(raw) {
  const compact = raw.replace(/\s+/g, '').toUpperCase()
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`
}

/**
 * A `type: form` page: every non-optional field must be filled in, and a
 * postcode field with a `format` error must hold a full UK postcode. Returns
 * every problem so the error summary can list one link per field, and the
 * submitted values so the form can be redrawn with them.
 */
function validateForm(page, body) {
  const errors = []
  const value = {}
  for (const field of page.content.fields || []) {
    const raw = String(body[field.name] || '').trim()
    if (!raw && !field.optional) {
      errors.push({
        field: field.name,
        message: fieldMessage(field, 'required')
      })
    } else if (raw && isCheckedPostcode(field)) {
      if (UK_POSTCODE.test(raw.replace(/\s+/g, ''))) {
        value[field.key] = formatPostcode(raw)
      } else {
        errors.push({
          field: field.name,
          message: field.errors.format
        })
      }
    } else if (raw) {
      value[field.key] = raw
    }
  }
  if (errors.length) {
    return { ok: false, errors, error: errors[0].message, values: body }
  }
  return { ok: true, value }
}

// The checkbox under a `type: signature` page's signature, named after
// the page's field
function agreementField(page) {
  return `${page.field}-agreement`
}

function agreementMessage(page) {
  const agreement = page.content.agreement || {}
  return (
    (agreement.errors && agreement.errors.required) || 'Select that you agree'
  )
}

/**
 * A `type: signature` page: the typed name, and the agreement checkbox
 * ticked when the page has one (see the page's `agreement:`). Returns
 * every problem, as a form page does, and stores the name.
 */
function validateSignature(page, body) {
  const errors = []
  const value = String(body[page.field] || '').trim()
  if (!value) {
    errors.push({ field: page.field, message: message(page, 'required') })
  }
  if (page.content.agreement) {
    const ticked = [].concat(body[agreementField(page)] || [])
    if (!ticked.includes('agree')) {
      errors.push({
        field: agreementField(page),
        message: agreementMessage(page)
      })
    }
  }
  if (errors.length) {
    return { ok: false, errors, error: errors[0].message, values: body }
  }
  return { ok: true, value }
}

/**
 * Error list shown when a form page is previewed with ?error=1 (every
 * required field's `required` message) or ?error=<key> (the fields whose
 * errors name that key, falling back to the required list when none do).
 */
function previewErrors(page, key = 'required') {
  if (page.type === 'signature') {
    return [
      { field: page.field, message: message(page, key) },
      ...(page.content.agreement
        ? [{ field: agreementField(page), message: agreementMessage(page) }]
        : [])
    ]
  }
  const fields = page.content.fields || []
  if (key !== 'required') {
    const named = fields.filter((field) => field.errors && field.errors[key])
    if (named.length) {
      return named.map((field) => ({
        field: field.name,
        message: fieldMessage(field, key)
      }))
    }
  }
  return fields
    .filter((field) => !field.optional)
    .map((field) => ({
      field: field.name,
      message: fieldMessage(field, 'required')
    }))
}

function validateFileUpload(page, body, file, multerError) {
  if (multerError) {
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      return fail(page, 'tooLarge')
    }
    return fail(page, 'uploadFailed')
  }
  if (!file) {
    return fail(page, 'required')
  }
  const name = String(file.originalname || '').toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const accept = page.accept || []
  if (accept.length && !accept.includes(ext)) {
    return fail(page, 'wrongType')
  }
  if (file.size === 0) {
    return fail(page, 'empty')
  }
  return { ok: true, value: file }
}

/**
 * Validate the submitted body/file for a page.
 * Returns { ok: true, value } or { ok: false, error }.
 */
function validatePage(page, body = {}, file, multerError) {
  switch (page.type) {
    case 'radios':
    case 'select':
      return validateRadios(page, body)
    case 'checkboxes':
    case 'check-answers':
      return validateCheckboxes(page, body)
    case 'input':
    case 'password':
      return validateInput(page, body)
    case 'signature':
      return validateSignature(page, body)
    case 'textarea':
      return validateTextarea(page, body)
    case 'form':
      return validateForm(page, body)
    case 'number':
      return validateNumber(page, body)
    case 'email':
      return validateEmailField(page, body)
    case 'file-upload':
      return validateFileUpload(page, body, file, multerError)
    default:
      return { ok: true, value: undefined }
  }
}

module.exports = { validatePage, previewErrors, message }
