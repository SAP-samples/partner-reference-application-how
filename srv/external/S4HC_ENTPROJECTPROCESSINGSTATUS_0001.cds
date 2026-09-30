/* checksum : 80ec27fcaec541180e0487d794b998e3 */
@cds.external                                       : true
@Common.ApplyMultiUnitBehaviorForSortingAndFiltering: true
@Capabilities.FilterFunctions                       : [
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'and',
  'or',
  'contains',
  'startswith',
  'endswith',
  'any',
  'all'
]
@SAP__support.TechnicalInfoLinks                    : {
  Url           : '../../../../default/iwbep/common/0001/$metadata',
  FunctionImport: 'GetTechnicalInfoLinks'
}
@Capabilities.SupportedFormats                      : [
  'application/json',
  'application/pdf'
]
@PDF.Features                                       : {
  DocumentDescriptionReference : '../../../../default/iwbep/common/0001/$metadata',
  DocumentDescriptionCollection: 'MyDocumentDescriptions',
  ArchiveFormat                : true,
  Border                       : true,
  CoverPage                    : true,
  FitToPage                    : true,
  FontName                     : true,
  FontSize                     : true,
  HeaderFooter                 : true,
  IANATimezoneFormat           : true,
  Margin                       : true,
  Padding                      : true,
  ResultSizeDefault            : 20000,
  ResultSizeMaximum            : 20000,
  Signature                    : true,
  TextDirectionLayout          : true,
  Treeview                     : true,
  UploadToFileShare            : true
}
@Capabilities.KeyAsSegmentSupported                 : true
@Capabilities.AsynchronousRequestsSupported         : true
service S4HC_ENTPROJECTPROCESSINGSTATUS_0001 {
  @cds.external                                                    : true
  @cds.persistence.skip                                            : true
  @Common.Label                                                    : 'Project Processing Status'
  @Capabilities.SearchRestrictions.Searchable                      : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions          : #group
  @Capabilities.SearchRestrictions.SearchSyntax                    : 'https://url.sap/odata-search'
  @Capabilities.InsertRestrictions.Insertable                      : false
  @Capabilities.DeleteRestrictions.Deletable                       : false
  @Capabilities.UpdateRestrictions.Updatable                       : false
  @Capabilities.UpdateRestrictions.NonUpdatableNavigationProperties: ['_ProcessingStatusText']
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported    : true
  entity ProcessingStatus {
        @Common.Text       : ProcessingStatusText
        @Common.IsUpperCase: true
        @Common.Label      : 'Processing Status'
    key ProcessingStatus      : String(2) not null;

        @Common.IsUpperCase: true
        @Common.Label      : 'Status'
        @Common.Heading    : 'Processing Status Text'
        @Common.QuickInfo  : 'Processing Status Text'
        ProcessingStatusText  : String(60) not null;

        @Common.Composition: true
        _ProcessingStatusText : Composition of many ProcessingStatusText {};
  };

  @cds.external                                                    : true
  @cds.persistence.skip                                            : true
  @Common.Label                                                    : 'Project Processing Status Description'
  @Capabilities.SearchRestrictions.Searchable                      : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions          : #group
  @Capabilities.SearchRestrictions.SearchSyntax                    : 'https://url.sap/odata-search'
  @Capabilities.InsertRestrictions.Insertable                      : false
  @Capabilities.DeleteRestrictions.Deletable                       : false
  @Capabilities.UpdateRestrictions.Updatable                       : false
  @Capabilities.UpdateRestrictions.NonUpdatableNavigationProperties: ['_ProcessingStatus']
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported    : true
  entity ProcessingStatusText {
        @Common.Label           : 'Language Key'
        @Common.Heading         : 'Language'
        @Common.DocumentationRef: 'urn:sap-com:documentation:key?=type=DE&id=SPRAS'
    key Language             : String(2) not null;

        @Common.Text            : ProcessingStatusText
        @Common.IsUpperCase     : true
        @Common.Label           : 'Processing Status'
    key ProcessingStatus     : String(2) not null;

        @Common.IsUpperCase     : true
        @Common.Label           : 'Status'
        @Common.Heading         : 'Processing Status Text'
        @Common.QuickInfo       : 'Processing Status Text'
        ProcessingStatusText : String(60) not null;
        _ProcessingStatus    : Association to one ProcessingStatus {};
  };
};
