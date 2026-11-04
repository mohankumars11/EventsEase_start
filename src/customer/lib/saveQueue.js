/**
 * Serialize asynchronous writes that target the same logical record.
 *
 * Different plans can save concurrently; writes to one customer's plan must
 * run in invocation order so an older network response cannot overwrite a
 * newer snapshot or a booking link.
 */
const queues = new Map()

export function serializeByKey(key, operation) {
  const previous = queues.get(key) ?? Promise.resolve()
  const current = previous.catch(() => {}).then(operation)
  queues.set(key, current)
  return current.finally(() => {
    if (queues.get(key) === current) queues.delete(key)
  })
}
