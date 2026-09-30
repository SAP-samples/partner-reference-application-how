const express = require('express');
const { doubleCsrf } = require('csrf-csrf');
const cookieParser = require('cookie-parser');
const process = require('node:process');

const isProduction = process.env.NODE_ENV === 'production';
const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'csrf-secret',
  getSessionIdentifier: () => '',
  cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',
  cookieOptions: { secure: isProduction, sameSite: 'lax', path: '/' }
});
const parseForm = express.urlencoded({ extended: false });

cds.on('bootstrap', (app) => {
  app
    .use(cookieParser())

    .head('/odata/v4/poetryslammanagerapi/documentAICallback', (req, res) => {
      res
        .set({
          'X-CSRF-Token': generateCsrfToken(req, res),
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        })
        .send();
    })

    // Document AI callback api is only served.
    .post(
      '/odata/v4/poetryslammanagerapi/documentAICallback',
      parseForm,
      doubleCsrfProtection,
      (req, res, next) => next()
    )

    .use((err, req, res, next) => {
      if (err.code !== 'EBADCSRFTOKEN') return next(err);
      res.status(403).set('X-CSRF-Token', 'required').send();
    });
});
