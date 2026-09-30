/* checksum : 99b7ccf19169818b53833fe7776b3ae4 */
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
service S4HC_ENTPROJECTPROFILECODE_0001 {
  @cds.external                                                    : true
  @cds.persistence.skip                                            : true
  @Common.Label                                                    : 'Project Profile'
  @Capabilities.SearchRestrictions.Searchable                      : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions          : #group
  @Capabilities.SearchRestrictions.SearchSyntax                    : 'https://url.sap/odata-search'
  @Capabilities.InsertRestrictions.Insertable                      : false
  @Capabilities.DeleteRestrictions.Deletable                       : false
  @Capabilities.UpdateRestrictions.Updatable                       : false
  @Capabilities.UpdateRestrictions.NonUpdatableNavigationProperties: ['_ProjectProfileCodeText']
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported    : true
  entity ProjectProfileCode {
        @Common.SAPObjectNodeTypeReference: 'ProjectProfileCode'
        @Common.Text                      : ProjectProfileCode
        @Common.IsUpperCase               : true
        @Common.Label                     : 'Project Profile'
        @Common.Heading                   : 'Prj.Prf'
        @Common.DocumentationRef          : 'urn:sap-com:documentation:key?=type=DE&id=PROFIDPROJ'
    key ProjectProfileCode      : String(7) not null;

        @Common.Label                     : 'Description'
        @Common.QuickInfo                 : 'Text for Profile'
        ProjectProfileCodeText  : String(40) not null;

        @Common.Composition: true
        _ProjectProfileCodeText : Composition of many ProjectProfileCodeText {};
  };

  @cds.external                                                    : true
  @cds.persistence.skip                                            : true
  @Common.Label                                                    : 'Project Profile Description'
  @Capabilities.SearchRestrictions.Searchable                      : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions          : #group
  @Capabilities.SearchRestrictions.SearchSyntax                    : 'https://url.sap/odata-search'
  @Capabilities.InsertRestrictions.Insertable                      : false
  @Capabilities.DeleteRestrictions.Deletable                       : false
  @Capabilities.UpdateRestrictions.Updatable                       : false
  @Capabilities.UpdateRestrictions.NonUpdatableNavigationProperties: ['_ProjectProfileCode']
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported    : true
  entity ProjectProfileCodeText {
        @Common.Label           : 'Language Key'
        @Common.Heading         : 'Language'
        @Common.DocumentationRef: 'urn:sap-com:documentation:key?=type=DE&id=SPRAS'
    key Language               : String(2) not null;

        @Common.Text            : ProjectProfileCode
        @Common.IsUpperCase     : true
        @Common.Label           : 'Project Profile'
        @Common.Heading         : 'Prj.Prf'
        @Common.DocumentationRef: 'urn:sap-com:documentation:key?=type=DE&id=PROFIDPROJ'
    key ProjectProfileCode     : String(7) not null;

        @Common.Label           : 'Description'
        @Common.QuickInfo       : 'Text for Profile'
        ProjectProfileCodeText : String(40) not null;
        _ProjectProfileCode    : Association to one ProjectProfileCode {};
  };
};
