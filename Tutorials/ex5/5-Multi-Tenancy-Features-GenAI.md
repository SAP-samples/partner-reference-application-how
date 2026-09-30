# Add Capabilities for Generative Artificial Intelligence (Gen AI)

Put yourself in the shoes of a poetry slam manager who uses a poetry slam management application to manage the events. You want to easily create events with creative titles and descriptions. 
For the title and description proposal, the Partner Reference Application uses generative artificial intelligence (generative AI or genAI) based on large language models (LLM).

## AI Ethics

SAP has introduced a [certification program](https://community.sap.com/t5/technology-blogs-by-sap/certification-for-partner-ai-apps-on-sap-btp-ensuring-reliability/ba-p/13751165) for partner applications developed on SAP BTP using the [generative AI hub](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/generative-ai-hub-in-sap-ai-core-7db524ee75e74bf8b50c167951fe34a5). This program includes checks for Responsible AI compliance. It enables partners to offer trusted, compliant, and enterprise-ready applications powered by AI services, leveraging SAP’s expertise in business data insights. Additionally, the [SAP Global AI Ethics Policy](https://www.sap.com/documents/2022/01/a8431b91-117e-0010-bca6-c68f7e60039b.html) and the [SAP AI Ethics Handbook](https://www.sap.com/documents/2023/03/7211ee96-647e-0010-bca6-c68f7e60039b.html) provide guidance on applying the SAP AI Policies. 

Furthermore, the SAP generative AI hub offers capabilities like [Data Masking](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/data-masking-d9a54d9ca54b40beacbd24e1663ec3b4) to support data protection and privacy implementation.

## Application Enablement 

1. Enhance the poetry slam service.

    1. Enhance the [poetry slam service definition](../../../ai-integration/srv/poetryslam/poetrySlamService.cds).
        1. Add a new action named *createWithAI* to the *PoetrySlams* entity. This action creates a new poetry slam event and uses generative AI to propose a title and description. 
            ```cds
            @(cds.odata.bindingparameter.collection)
            @(UI.IsAIOperation: true) // Add the AI Icon to the action button
            action createWithAI(
                @(
                    title: '{i18n>languageInput}',
                    mandatory: true,
                    Common:{
                        ValueListWithFixedValues: false,
                        ValueList               : {
                            $Type         : 'Common.ValueListType',
                            CollectionPath: 'Language',
                            Parameters    : [
                                {
                                    $Type            : 'Common.ValueListParameterInOut',
                                    ValueListProperty: 'name',
                                    LocalDataProperty: language,
                                },
                                {
                                    $Type            : 'Common.ValueListParameterDisplayOnly',
                                    ValueListProperty: 'code'
                                },
                                {
                                    $Type            : 'Common.ValueListParameterDisplayOnly',
                                    ValueListProperty: 'descr'
                                }
                            ]
                        },
                    }
                )
                language : String(50),
                @(
                    title: '{i18n>tagsInput}',
                    UI.Placeholder: '{i18n>placeholder}',
                    mandatory: true
                )
                tags : String(100),
                @(
                    title: '{i18n>rhymeInput}',
                    UI.ParameterDefaultValue: true
                )
                rhyme : Boolean, ) returns PoetrySlams;
            ```

        2. Add the **Language** entity from the *sap.common.Languages* module.
            ```cds
            //Languages
            entity Language    as projection on sap.common.Languages;
            ```

    2. Copy the [srv/lib/genAI.js](../../../ai-integration/srv/lib/genAI.js) file with the genAI class to your project.

    3. Extend the [srv/poetryslam/poetrySlamServicePoetrySlamsImplementation.js](../../../ai-integration/srv/poetryslam/poetrySlamServicePoetrySlamsImplementation.js) service implementation file with the implementation of the action.

        1. Import the genAI class.

            ```js
            const GenAI = require('../lib/genAI');
            ```

        2. Add the action implementation.

            ```js
            // Entity action: Create a poetry slam with generative artificial intelligence
            srv.on('createWithAI', async (req) => {
                const genAI = await GenAI.init();
            
                const response = await genAI.callOrchestrationChatCompletion(
                  req.data.tags,
                  req.data.language,
                  req.data.rhyme,
                  req
                );

                // In case the orchestration call could not be started, no draft will be created
                if (!response) return null;
            
                const poetrySlamDraft = await GenAI.createPoetrySlamWithAI(
                  response,
                  req,
                  srv,
                  db
                );
                return poetrySlamDraft;
            });
            ```

    4. Add UI texts for the action parameter dialog into the [srv/i18n/i18n.properties](../../../ai-integration/srv/i18n/i18n.properties) file.

        ```
        # -------------------------------------------------------------------------------------
        # AI 

        languageInput           = Select the language in which you want the title and description to be generated
        tagsInput               = Add some tags to describe the generated title and description
        rhymeInput              = Generate the description in rhymes
        placeholder             = For example: creative, funny
        ```

    5. Add the message texts for the action error handling into the [srv/i18n/messages.properties](../../../ai-integration/srv/i18n/messages.properties) file.

        ```
        ACTION_AI_NO_ACCESS                                     = Access to SAP AI Core service isn’t possible. Please reach out to your application provider. 
        ACTION_AI_SETUP                                         = The AI feature is setting up. Please try again shortly.
        ACTION_AI_MISSING_PARAMETERS                            = Please enter a language and tags. 
        ACTION_AI_INVALID_PARAMETERS                            = Invalid parameters. Please check your input.
        ```

2. Enhance the SAP Fiori elements UI of the **Poetry Slams** application. 

    1. Enhance the *LineItem*  section of the [app/poetryslams/annotations](../../../ai-integration/app/poetryslams/annotations.cds) file. 
    
        ```cds
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'PoetrySlamService.createWithAI',
            Label : '{i18n>createWithAI}'
        },
        ```      

    2. Add the UI text for the button into the [/app/poetryslams/i18n/i18n.properties](../../../ai-integration/app/poetryslams/i18n/i18n.properties) file.

        ```
        createWithAI            = Create with Slamtastic AI
        ```

3. Add the required npm modules as dependencies to the *package.json* file of your project.
    
    1. Open a terminal.
    
    2. Run the `npm add @sap-ai-sdk/orchestration` command.

    3. Run the `npm add @sap-ai-sdk/prompt-registry` command.

## Configuration for SAP BTP
Add the SAP AI Core service as a resource in the [mta.yaml](../../../ai-integration/mta.yaml) file.

    ```yaml
    modules:
        - name: poetry-slams-srv
          requires:
            - name: poetry-slams-aicore

        - name: poetry-slams-mtx
          requires:
            - name: poetry-slams-aicore

    resources:
        # AI Core Service
        - name: poetry-slams-aicore
            type: org.cloudfoundry.managed-service
            parameters:
            service: aicore
            service-plan: extended
    ```


1. Run the `npm install` command in your project root folder to install the required npm modules. 

2. Build and deploy the application.

## A Guided Tour to Explore the Generative Artificial Intelligence Feature

Now it's time to take you on a guided tour through the generative artificial intelligence feature of the **Poetry Slam Manager**: 

1. Open the SAP BTP cockpit of the customer subaccount.

2. Open the **Poetry Slams** application.

3. Choose **Create with Slamtastic AI** to create a new poetry slam with a proposed title and description from generative artificial intelligence.

4. Select a language.

5. Add one or more tags that describe the content and style of the proposed title and description. Examples are *funny* and *creative*. 

6. The parameter *rhyme* is defaulted. Stay with the default to get a text that is a rhyme. 

# Conclusion

That's it! You have created a CAP NodeJS application, deployed it to SAP BTP, added an SAP S/4HANA Cloud Public Edition and enhanced it to add a generative artificial intelligence feature.

If you had issues finishing all the stepsm, don't worry. You can [jump back to the overview page Sync Point 2, 3 and 4](./../../README.md).
