/**
 * Journey engine: server-side validation for question pages
 *
 * Every error message comes from the page's `errors:` frontmatter so the
 * content designer owns the wording. Keys:
 *   required   nothing entered / selected / uploaded
 *   invalid    not a number
 *   whole      not a whole number
 *   min, max   number out of range
 *   format     email in the wrong shape
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

/**
 * A `type: form` page: every non-optional field must be filled in. Returns
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
    } else if (raw) {
      value[field.key] = raw
    }
  }
  if (errors.length) {
    return { ok: false, errors, error: errors[0].message, values: body }
  }
  return { ok: true, value }
}

/**
 * Error list shown when a form page is previewed with ?error=1.
 */
function previewErrors(page) {
  return (page.content.fields || [])
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
      return validateRadios(page, body)
    case 'checkboxes':
      return validateCheckboxes(page, body)
    case 'input':
    case 'password':
      return validateInput(page, body)
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
