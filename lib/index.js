/**
 * Restores `ctx.connection.requestRejection(request)` for plugins built against
 * a released 0.2.2 line, where that fence method existed as a thin wrapper over
 * `admit()`. A source checkout newer than the release replaced it with
 * `admit()`, so any plugin still calling the old method throws inside every
 * route handler it fences and the route answers a bare 400.
 *
 * The shim defines nothing when the method already exists, so it stays
 * harmless once the host and the plugin line up again.
 */
export const name = '@inhuman/dsh-web-compat'
export const inject = ['connection', 'connection.authentication']

/**
 * Install the missing fence method on the connection service.
 * @param ctx - host plugin scope that injected `connection`.
 */
export function apply(ctx) {
  const connection = ctx.connection
  if (typeof connection.requestRejection === 'function') return
  const requestRejection = (request) => {
    const admission = connection.admit(request)
    return admission !== undefined && 'rejection' in admission ? admission.rejection : undefined
  }
  connection.requestRejection = requestRejection
  ctx.effect(() => () => {
    if (connection.requestRejection === requestRejection) delete connection.requestRejection
  }, 'dsh-web-compat: requestRejection')
}
