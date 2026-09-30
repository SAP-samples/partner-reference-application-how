using {sap.samples.poetryslams as poetrySlamManagerModel} from '../../db/poetrySlamManagerModel';

//Service for Poetry Slam Applications for role PoetrySlamManager
service PoetrySlamManagerAPIService @(
  path: 'poetryslammanagerapi',
  impl: './poetrySlamManagerAPIImplementation.js'
) {

  // ----------------------------------------------------------------------------
  // Entity inclusions

  // Poetry Slams without draft handling
  entity PoetrySlams as
    projection on poetrySlamManagerModel.PoetrySlams {
      // Selects specific fields of the PoetrySlams domain model
      ID,
      number,
      title,
      description,
      dateTime,
      visitorsFeeAmount,
      visitorsFeeCurrency,
      status,
      visits,
      documentAIDocID
    };

  // Visitors
  entity Visitors    as
    projection on poetrySlamManagerModel.Visitors {
      * // Selects all fields of the Visitors database model
    };

  // Visits
  entity Visits      as
    projection on poetrySlamManagerModel.Visits {
      *
    };

  // Unbound action for Document AI callback
  action documentAICallback(NotificationTargetStatus: String(100),
                            AdditionalInfo: String(50000),
                            NotificationObjectType: String(100),
                            NotificationType: String(1),
                            NotificationObjectId: UUID,
                            DocumentResult: LargeString) returns String;
}
