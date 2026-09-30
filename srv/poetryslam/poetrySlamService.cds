using {sap.samples.poetryslams as poetrySlamManagerModel} from '../../db/poetrySlamManagerModel';
using sap from '@sap/cds/common';

//Service for Poetry Slam Applications for role PoetrySlamManager
service PoetrySlamService @(
  path: 'poetryslamservice',
  impl: './poetrySlamServiceImplementation.js'
) {

  // ----------------------------------------------------------------------------
  // Entity inclusions

  // Poetry Slams (draft enabled)
  @odata.draft.enabled
  @Common.SemanticObject: 'poetryslams'
  @Common.SemanticKey   : [ID]
  entity PoetrySlams as
    select from poetrySlamManagerModel.PoetrySlams {
      // Selects all fields of the PoetrySlams domain model
      *,
      maxVisitorsNumber - freeVisitorSeats as bookedSeats              : Integer      @title     : '{i18n>bookedSeats}',
      // Relevant for coloring of status in UI to show criticality
      virtual null                         as statusCriticality        : Integer      @title     : '{i18n>statusCriticality}',
      virtual null                         as projectSystemName        : String(255)  @title: '{i18n>projectSystemName}'  @odata.Type: 'Edm.String',
      // SAP S/4HANA Cloud projects: visibility of button "Create Project in SAP S/4HANA Cloud", code texts
      virtual null                         as createS4HCProjectEnabled : Boolean      @odata.Type: 'Edm.Boolean',
      virtual null                         as projectProfileCodeText   : String(40)   @title: '{i18n>projectProfile}'     @odata.Type: 'Edm.String',
      virtual null                         as processingStatusText     : String(60)   @title: '{i18n>processingStatus}'   @odata.Type: 'Edm.String',
      virtual null                         as projectURL               : String(255)  @title: '{i18n>projectURL}'         @odata.Type: 'Edm.String',
      virtual null                         as isS4HC                   : Boolean      @odata.Type: 'Edm.Boolean',
      // Projection of remote service data as required by the UI
      toS4HCProject                                                    : Association to PoetrySlamService.S4HCProjects
                                                                           on toS4HCProject.project = $self.projectID
    }
    actions {
      // Action: Cancel
      @(
        // Defines that poetryslam entity is affected and targeted by the action
        Common.SideEffects             : {TargetProperties: [
          'poetryslam/status_code',
          'poetryslam/statusCriticality'
        ]},
        // Determines that poetryslam entity is used when the action is performed
        cds.odata.bindingparameter.name: 'poetryslam'
      )
      action cancel()                               returns PoetrySlams;

      // Action: Publish
      @(
        // Defines that poetryslam entity is affected and targeted by the action
        Common.SideEffects             : {TargetProperties: [
          'poetryslam/status_code',
          'poetryslam/statusCriticality'
        ]},
        // Determines that poetryslam entity is used when the action is performed
        cds.odata.bindingparameter.name: 'poetryslam'
      )
      action publish()                              returns PoetrySlams;

      // SAP S/4HANA Cloud projects: action to create a project in SAP S/4HANA Cloud
      @(
        Common.SideEffects             : {TargetEntities: [
          '_poetryslam',
          '_poetryslam/toS4HCProject'
        ]},
        cds.odata.bindingparameter.name: '_poetryslam'
      )
      action createS4HCProject()                    returns PoetrySlams;

      // ERP systems: action to clear the project data
      @(
        Common.SideEffects             : {TargetEntities: [
          '_poetryslam',
          '_poetryslam/toS4HCProject'
        ]},
        cds.odata.bindingparameter.name: '_poetryslam'
      )
      action clearProjectData();

      // Action: Upload guest list to SAP Document AI
      action uploadGuestList(fileContent: LargeBinary,
                             fileName: String(255),
                             mimeType: String(100)) returns String;
    };

  // Visitors
  @readonly
  @Common.SemanticObject: 'visitors'
  @Common.SemanticKey   : [ID]
  entity Visitors    as
    projection on poetrySlamManagerModel.Visitors {
      * // Selects all fields of the Visitors database model
    };

  // Visits
  @Common.SemanticObject: 'visits'
  @Common.SemanticKey   : [ID]
  entity Visits      as
    projection on poetrySlamManagerModel.Visits {
      *, // Selects all fields of the Visits database model
      virtual null as statusCriticality : Integer @title: '{i18n>statusCriticality}'
    }
    actions {
      // Action: Cancel Visit
      @(
        Common.SideEffects             : {TargetProperties: [
          'visits/statusCriticality',
          'visits/status_code',
          'visits/parent/status_code',
          'visits/parent/statusCriticality',
          'visits/parent/freeVisitorSeats',
          'visits/parent/bookedSeats'
        ]},
        cds.odata.bindingparameter.name: 'visits'
      )
      action cancelVisit()  returns Visits;

      // Action: Confirm Visit
      @(
        Common.SideEffects             : {TargetProperties: [
          'visits/statusCriticality',
          'visits/status_code',
          'visits/parent/status_code',
          'visits/parent/statusCriticality',
          'visits/parent/freeVisitorSeats',
          'visits/parent/bookedSeats'
        ]},
        cds.odata.bindingparameter.name: 'visits'
      )
      action confirmVisit() returns Visits;
    };

  // Currencies
  entity Currencies  as projection on sap.common.Currencies;

  // ----------------------------------------------------------------------------
  // Function to get user information (example for entity-independent function)

  type userRoles {
    identified    : Boolean;
    authenticated : Boolean;
  };

  type user {
    id     : String(255);
    locale : String(14);
    roles  : userRoles;
  };

  function userInfo()       returns user;

  @Common.SideEffects: {TargetEntities: ['/PoetrySlamService.EntityContainer/PoetrySlams']}
  action   createTestData() returns Boolean;
}

// -------------------------------------------------------------------------------
// Extend service PoetrySlamService by SAP S/4HANA Cloud projects (principal propagation)

using {S4HC_API_ENTERPRISE_PROJECT_SRV_0002 as RemoteS4HCProject} from '../external/S4HC_API_ENTERPRISE_PROJECT_SRV_0002';

extend service PoetrySlamService with {
  entity S4HCProjects as
    projection on RemoteS4HCProject.A_EnterpriseProject {
      key ProjectUUID           as projectUUID,
          Project               as project,
          ProjectDescription    as projectDescription,
          ResponsibleCostCenter as responsibleCostCenter,
          ProjectStartDate      as projectStartDate,
          ProjectEndDate        as projectEndDate,
          ProjectProfileCode    as projectProfileCode,
          ProcessingStatus      as processingStatus,
    }
};
