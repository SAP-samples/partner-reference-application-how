'use strict';
// Type definition required for CDSLint
/** @typedef {import('@sap/cds').CRUDEventHandler.On} OnHandler */

// eslint-disable-next-line no-unused-vars
const cds = require('@sap/cds');

// Include codelists
const { httpCodes, poetrySlamStatusCode } = require('../lib/codes');

// Document AI library
const DocumentAI = require('../lib/documentAI');

// Type definition required for CDSLint
/** @type {OnHandler} */
module.exports = async (srv) => {
  const { PoetrySlams } = srv.entities;

  // Entity action "uploadGuestList": Extract guest list via Document AI and create visitors/visits
  srv.on('uploadGuestList', PoetrySlams, async (req) => {
    const { fileContent, mimeType, fileName } = req.data;
    const poetrySlamID = req.params[req.params.length - 1].ID;

    const poetrySlam = await SELECT.one
      .from('PoetrySlamService.PoetrySlams')
      .columns('status_code', 'freeVisitorSeats', 'number')
      .where({ ID: poetrySlamID });

    if (!poetrySlam) {
      console.error('Poetry Slam not found');
      req.error(httpCodes.bad_request, 'POETRYSLAM_NOT_FOUND', [poetrySlamID]);
      return;
    }

    if (poetrySlam.status_code !== poetrySlamStatusCode.published) {
      req.error(httpCodes.bad_request, 'POETRYSLAM_NOT_PUBLISHED', [
        poetrySlam.number
      ]);
      return;
    }

    const documentAI = new DocumentAI(req);
    const documentAIDocID = await documentAI.extractGuestList(
      fileContent,
      mimeType,
      fileName
    );

    const result = await UPDATE('PoetrySlamService.PoetrySlams')
      .set({ documentAIDocID: documentAIDocID })
      .where({ ID: poetrySlamID });

    if (result !== 1) {
      console.error('PoetrySlam could not be updated.');
      req.error(
        httpCodes.internal_server_error,
        'POETRYSLAM_COULD_NOT_BE_UPDATED',
        [poetrySlam.number]
      );
      return;
    }

    const docAiUrl = documentAI.buildDocumentAIUrl(documentAIDocID);

    return { docAiUrl };
  });
};
