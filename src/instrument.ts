const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
  void import('./sentry')
    .then(({ initSentry }) => initSentry(dsn))
    .catch(() => {
      // Error reporting is optional: the app must keep working if the Sentry chunk cannot load.
    })
}
