sap.ui.define(
  [
    'sap/m/MessageBox',
    'sap/m/MessageToast',
    'sap/m/Dialog',
    'sap/m/Button',
    'sap/m/library',
    'sap/ui/unified/FileUploader'
  ],
  function (
    MessageBox,
    MessageToast,
    Dialog,
    Button,
    mobileLibrary,
    FileUploader
  ) {
    'use strict';

    const ButtonType = mobileLibrary.ButtonType;

    const ACCEPTED_FILE_TYPES = 'pdf,xlsx,xls';
    const ACCEPTED_MIME_TYPES =
      'application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
    const UPLOAD_ACTION_PATH = 'PoetrySlamService.uploadGuestList(...)';

    // ----------------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------------

    function readFileAsBase64(oFile, oBundle) {
      return new Promise((resolve, reject) => {
        const oReader = new window.FileReader();
        oReader.onload = (e) => resolve(e.target.result.split(',')[1]);
        oReader.onerror = () =>
          reject(new Error(oBundle.getText('readFileFailed')));
        oReader.readAsDataURL(oFile);
      });
    }

    async function executeUploadAction(oModel, oContext, oParams) {
      const oOperation = oModel.bindContext(UPLOAD_ACTION_PATH, oContext);

      oOperation.setParameter('fileContent', oParams.fileContent);
      oOperation.setParameter('fileName', oParams.fileName);
      oOperation.setParameter('mimeType', oParams.mimeType);

      await oOperation.execute();

      return oOperation.getBoundContext().getObject();
    }

    function showSuccessDialog(sDocAiUrl, oBundle) {
      MessageBox.success(oBundle.getText('docExtractionCompleted'), {
        actions: [oBundle.getText('openDocument'), MessageBox.Action.OK],
        emphasizedAction: oBundle.getText('openDocument'),
        onClose: function (sAction) {
          if (sAction === oBundle.getText('openDocument')) {
            window.open(sDocAiUrl, '_blank');
          }
        }
      });
    }

    async function handleFileUpload(oFile, oModel, oContext, oBundle) {
      try {
        MessageToast.show(oBundle.getText('docExtractionStarted'), {
          duration: 3000,
          width: '15em'
        });

        const sBase64Content = await readFileAsBase64(oFile, oBundle);

        if (!oFile.type) {
          MessageBox.error(oBundle.getText('mimeTypeNotFound'));
        }

        const oResult = await executeUploadAction(oModel, oContext, {
          fileContent: sBase64Content,
          fileName: oFile.name,
          mimeType: oFile.type
        });

        showSuccessDialog(oResult.docAiUrl, oBundle);
        oContext.refresh();
      } catch (oError) {
        MessageBox.error(
          oError.message || oBundle.getText('docExtractionFailed')
        );
      }
    }

    // ----------------------------------------------------------------------------
    // Custom Actions
    // ----------------------------------------------------------------------------

    return {
      /**
       * Opens a file picker dialog and uploads the selected guest list to
       * SAP Document AI for extraction. Supports PDF and Excel files.
       * @param {sap.ui.model.odata.v4.Context} oBindingContext - The binding context.
       */
      uploadGuestList: function (oBindingContext) {
        const oModel = this._controller.getView().getModel();
        const oBundle = this._controller
          .getView()
          .getModel('i18n')
          .getResourceBundle();
        const oContext = oBindingContext;

        let oSelectedFile = null;

        const oFileUploader = new FileUploader({
          fileType: ACCEPTED_FILE_TYPES,
          mimeType: ACCEPTED_MIME_TYPES,
          uploadOnChange: false,
          width: '100%',
          placeholder: oBundle.getText('selectFile'),
          change: function (oEvent) {
            const oFiles = oEvent.getParameter('files');
            oSelectedFile = oFiles && oFiles[0];
          }
        });

        const oDialog = new Dialog({
          title: oBundle.getText('uploadGuestList'),
          content: [oFileUploader],
          beginButton: new Button({
            text: oBundle.getText('upload'),
            type: ButtonType.Emphasized,
            press: function () {
              if (!oSelectedFile) {
                MessageToast.show(oBundle.getText('selectFileFirst'));
                return;
              }

              oDialog.close();
              handleFileUpload(oSelectedFile, oModel, oContext, oBundle);
            }
          }),
          endButton: new Button({
            text: oBundle.getText('cancel'),
            press: function () {
              oDialog.close();
            }
          }),
          afterClose: function () {
            oDialog.destroy();
          }
        });

        oDialog.open();
      }
    };
  }
);
