'use strict';

/**
 * @fileoverview Implementation of the Poetry Slam Manager API Service.
 * Handles Document AI callback to extract visitor and artist information from an uploaded guest list.
 * @module poetrySlamManagerAPIImplementation
 */

/** @typedef {import('@sap/cds').CRUDEventHandler.On} OnHandler */

const cds = require('@sap/cds');
const DocumentAI = require('../lib/documentAI');
const { httpCodes, visitStatusCode } = require('../lib/codes');
const {
  calculatePoetrySlamData,
  updatePoetrySlam
} = require('../lib/entityCalculations');

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const ENTITY_POETRY_SLAMS = 'PoetrySlamService.PoetrySlams';
const ENTITY_VISITORS = 'PoetrySlamService.Visitors';
const ENTITY_VISITS = 'PoetrySlamService.Visits';

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Finds a poetry slam by its document ID.
 * @param {string} documentAIDocID - The Document AI document identifier.
 * @returns {Promise<object|null>} The poetry slam entity or null if not found.
 */
async function findPoetrySlamByDocumentAIDocID(documentAIDocID) {
  return SELECT.one
    .from(ENTITY_POETRY_SLAMS)
    .where({ documentAIDocID: documentAIDocID });
}

/**
 * Validates that sufficient seats are available for the guest list.
 * @param {object} poetrySlam - The poetry slam entity.
 * @param {number} guestCount - Number of guests to add.
 * @param {object} req - The CAP request object.
 * @returns {boolean} True if validation passes, false otherwise.
 */
function validateSeatAvailability(poetrySlam, guestCount, req) {
  if (poetrySlam.freeVisitorSeats < guestCount) {
    req.error(httpCodes.bad_request, 'NOT_ENOUGH_SEATS', [
      guestCount - poetrySlam.freeVisitorSeats
    ]);

    return false;
  }
  return true;
}

/**
 * Processes all guests from the extracted guest list using batch DB operations.
 * Minimizes database round-trips by collecting all data first and performing
 * bulk SELECT and INSERT operations.
 * @param {Array<object>} guestList - Array of guest objects from Document AI.
 * @param {string} poetrySlamId - The poetry slam ID.
 * @returns {Promise<object>} Statistics about the processing.
 */
async function processGuestList(guestList, poetrySlamId) {
  const stats = {
    visitorsCreated: 0,
    visitorsAlreadyKnown: 0,
    visitsCreated: 0,
    visitsSkipped: 0
  };

  if (guestList.length === 0) {
    return stats;
  }

  // Step 1: Batch fetch existing visitors by email
  const emails = guestList.map((person) => person.email);
  const existingVisitors = await SELECT.from(ENTITY_VISITORS)
    .columns('ID', 'name', 'email')
    .where({ email: { in: emails } });

  const visitorsByEmail = new Map();
  for (const visitor of existingVisitors) {
    visitorsByEmail.set(visitor.email, visitor);
  }

  // Step 2: Prepare new visitors to insert in batch
  const newVisitorEntries = [];
  const guestVisitorMap = new Map(); // email -> visitorId

  for (const person of guestList) {
    const existing = visitorsByEmail.get(person.email);
    if (existing) {
      guestVisitorMap.set(person.email, existing.ID);
      stats.visitorsAlreadyKnown++;
    } else {
      const visitorId = cds.utils.uuid();
      newVisitorEntries.push({
        ID: visitorId,
        name: person.name,
        email: person.email
      });
      guestVisitorMap.set(person.email, visitorId);
      stats.visitorsCreated++;
    }
  }

  // Batch insert all new visitors in one go
  if (newVisitorEntries.length > 0) {
    await INSERT.into(ENTITY_VISITORS).entries(newVisitorEntries);
  }

  // Step 3: Batch fetch existing visits for this poetry slam
  const allVisitorIds = [...guestVisitorMap.values()];
  const existingVisits = await SELECT.from(ENTITY_VISITS)
    .columns('ID', 'visitor_ID')
    .where({ parent_ID: poetrySlamId, visitor_ID: { in: allVisitorIds } });

  const existingVisitVisitorIds = new Set(
    existingVisits.map((v) => v.visitor_ID)
  );

  // Step 4: Prepare new visits to insert in batch
  const newVisitEntries = [];

  for (const person of guestList) {
    const visitorId = guestVisitorMap.get(person.email);
    if (existingVisitVisitorIds.has(visitorId)) {
      stats.visitsSkipped++;
    } else {
      newVisitEntries.push({
        ID: cds.utils.uuid(),
        parent_ID: poetrySlamId,
        visitor_ID: visitorId,
        artistIndicator: person.artistIndicator,
        status_code: visitStatusCode.booked
      });
      stats.visitsCreated++;
    }
  }

  // Batch insert all new visits in one go
  if (newVisitEntries.length > 0) {
    await INSERT.into(ENTITY_VISITS).entries(newVisitEntries);
  }

  return stats;
}

/**
 * Logs the processing statistics.
 * @param {object} stats - The processing statistics.
 */
function logProcessingStats(stats, notificationObjectId) {
  console.log(
    `Guest list processed for document id - ${notificationObjectId} : ${stats.visitorsCreated} new visitor(s) created, ` +
      `${stats.visitorsAlreadyKnown} already known, ` +
      `${stats.visitsCreated} visit(s) booked, ` +
      `${stats.visitsSkipped} skipped.`
  );
}

// ----------------------------------------------------------------------------
// Service Implementation
// ----------------------------------------------------------------------------

/**
 * Poetry Slam Manager API Service implementation.
 * @type {OnHandler}
 */
module.exports = async (srv) => {
  /**
   * Action handler for Document AI callback.
   * Receives notifications from the Document AI service after document processing
   * completes, extracts the guest list, and creates visitors and visits.
   */
  srv.on('documentAICallback', async (req) => {
    const { NotificationObjectId: notificationObjectId } = req.data;

    // Set empty target name to prevent CAP from inferring entity context
    req.target = { name: '' };

    console.log(
      'Document AI Callback received:',
      JSON.stringify(req.data, null, 2)
    );

    // Extract poetry slam and update with Document AI visitors with the information
    const poetrySlam =
      await findPoetrySlamByDocumentAIDocID(notificationObjectId);

    if (!poetrySlam) {
      console.error(
        `Poetry slam not found for document ID: ${notificationObjectId}`
      );
      req.error(httpCodes.bad_request, 'POETRYSLAM_NOT_FOUND', [
        notificationObjectId
      ]);
      return;
    }

    const poetrySlamId = poetrySlam.ID;

    const documentAI = new DocumentAI(req);
    const entities =
      await documentAI.getExtractedEntities(notificationObjectId);
    const guestList = documentAI.parseEntitiesToVisitors(entities);

    if (!validateSeatAvailability(poetrySlam, guestList.length, req)) {
      return;
    }

    const stats = await processGuestList(guestList, poetrySlamId);

    const changedData = await calculatePoetrySlamData(poetrySlamId, req);
    await updatePoetrySlam(
      poetrySlamId,
      changedData.status_code,
      changedData.freeVisitorSeats,
      req,
      { text: 'UPLOAD_GUEST_LIST_UPDATE_FAILED', param: poetrySlamId }
    );

    logProcessingStats(stats, notificationObjectId);

    // Clear the documentAIDocID after successful processing
    await UPDATE(ENTITY_POETRY_SLAMS)
      .set({ documentAIDocID: null })
      .where({ ID: poetrySlamId });

    return stats;
  });
};
