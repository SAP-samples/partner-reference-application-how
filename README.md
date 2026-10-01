# Description

This repository contains the material for developing the multi-tenant Partner Reference Application, including the integration of SAP S/4HANA Cloud Public Edition and the SAP AI Core service. This workshop is based on the [Partner Reference Application](https://github.com/SAP-samples/partner-reference-application) and explains how to build your own multi-tenant application with CAP and deploy it to SAP BTP.

## Overview

In this session, you create your own CAP Node.js multi-tenant application called *Poetry Slam Manager*, learn how to deploy it to SAP BTP, subscribe it to different consumers, enhance it by adding SAP S/4HANA Cloud Public Edition integration, and make use of the SAP Gen AI feature.

Imagine you're an event manager, and your job is to organize and host poetry slams. 

As your company runs its business on a cloud ERP system provided by SAP, you use its project management component to plan and staff events, to collect costs, and to purchase equipment.
Additionally, an SAP partner provided you with a side-by-side application called *Poetry Slam Manager* (PSM) to publish poetry slam events and to manage bookings of visitors and artists such as Julie.

## Requirements

To follow the exercises in this repository, you need the following:

- A SAP BTP global account.
- SAP Business Application Studio.
- An SAP S/4HANA Cloud Public Edition instance.
- A SAP BTP provider subaccount where the **Poetry Slam Manager** application is deployed.
- A SAP BTP subaccount for the customer where a subscription of the **Poetry Slam Manager** application is done.
      
## Mission Briefing

**You prepared the SAP BTP subaccounts and run the Partner Reference Application locally**
- You can use the SAP Business Application Studio within your provider subaccount.
- The application is built in SAP Business Application Studio.
- The application runs locally with the demo data.

**You enhanced and deployed the Partner Reference Application to the SAP BTP and set up a subscription in the customer account**
- The Partner Reference Application is deployed to your provider subaccount.
- Your subscriber has subscribed to the Partner Reference Application.
- SAP Build Work Zone is set up and can access the Partner Reference Application in your subscriber subaccount.

**You added the SAP S/4HANA Cloud Public Edition integration**
- You enhanced and deployed the Partner Reference Application to support ERP systems.
- In your Partner Reference Application, you can now open projects in a poetry slam and navigate to the corresponding project in SAP S/4HANA Cloud Public Edition.

**You added the GenAI feature**
- You further enhanced and deployed the Partner Reference Application to support GenAI.
- You also learn how to secure your prompt.
- You can now create creative poetry slams by choosing *Generate with AI* and providing information about the topic.

## Exercises

- Getting Started
    - [Get an overview of the system landscape](./Tutorials/ex0/README.md)
    - [Set entitlements in your SAP BTP provider and customer subaccount](./Tutorials/ex0/SetupBTPEnvironment.md)

- Exercise 1 - Develop you multi-tenant CAP application and prepare it for deployment to SAP BTP.
    - [Exercise 1.1 - Prepare the SAP BTP subaccounts for development](Tutorials/ex1/1.1-Prepare-BTP-Account-for-dev.md)
    - [Exercise 1.2 - Develop the core Partner Reference Application](Tutorials/ex1/1.2-Develop-Core-Application.md)
    - [Exercise 1.3 - Develop the core user interface](Tutorials/ex1/1.3-Develop-Core-UserInterface.md)
    - [Exercise 1.4 - Develop the core finetuning](Tutorials/ex1/1.4-Develop-Core-Finetuning.md)
    - [Exercise 1.5 - Go on a guided tour of the locally running application](Tutorials/ex1/1.5-Guided-Tour%20LOCAL.md)
    - [Exercise 1.6 - Enhance the Partner Reference Application for multi-tenant deployment](Tutorials/ex1/1.6-Multi-Tenancy-Develop-Sample-Application.md)

- Exercise 2 - Deploy you multi-tenant CAP application to your provider subaccount and subscribe it in your customer subaccount.
    - [Exercise 2.1 - Deploy the Partner Reference Application](Tutorials/ex2/2.1-Multi-Tenancy-Deployment.md)
    - [Exercise 2.2 - Subscribe and access the Partner Reference Application](Tutorials/ex2/2.2-Multi-Tenancy-Provisioning.md)

- Exercise 3 - Enhance the Partner Reference Application with SAP S/4HANA Cloud Public Edition integration.
    - [Exercise 3.1 - Enhance the Partner Reference Application for ERP integration](Tutorials/ex3/3.1-S4HC-Integration.md)
    - [Exercise 3.2 - Set up the SAP BTP subaccounts for the ERP integration](Tutorials/ex3/3.2-Multi-Tenancy-Provisioning-Connect-S4HC.md)
    - [Exercise 3.3 - Explore the SAP S/4HANA Cloud Public Edition integration](Tutorials/ex3/3.3-Guided-Tour-ERP-Integration.md)

- Exercise 4 - Use a service broker to get API access to SAP BTP applications.
    - [Exercise 4.1 - Enable API access to SAP BTP applications using a service broker](Tutorials/ex4/4.1-Multi-Tenancy-Service-Broker.md)
    - [Exercise 4.2 - Configure and consume the APIs of the SAP BTP application](Tutorials/ex4/4.2-Multi-Tenancy-Provisioning-Service-Broker.md)

- [Exercise 5 - Add the AI feature to generate Poetry Slams to the Partner Reference Application](Tutorials/ex5/5-Multi-Tenancy-Features-GenAI.md)

- [Exercise 5.1 - Add the AI feature to scan and analyze data from documents](Tutorials/ex5.1/5.1-Multi-Tenancy-Features-Document-AI.md)

## Sync Points After the Different Implementation Steps 

> **Note:** This information is relevant for later stages of the implementation.

### Sync Point 1
Now that you've built the base model of the Partner Reference Application and enabled it for multitenancy, you need to clone our branch with the multi-tenant application. This ensures that everyone has the same changes for the application deployment. The following steps explain this in detail.
1. Clone the application into your SAP Business Application Studio.
    1. In SAP Business Application Studio, open the **Command Palette** and enter *Git: Clone*.
    2. Enter the repository URL and hit **Enter**:
   	https://github.com/SAP-samples/partner-reference-application-how.git.
    3. Open your newly cloned project and run the following command in terminal:
    ```
    git checkout multi-tenant
    ``` 

2. After you've done all steps above, you can continue with [deploying the multi-tenant application to the provider SAP BTP subaccount](Tutorials/ex2/2.1-Multi-Tenancy-Deployment.md).

### Sync Point 2, 3 and 4
It's now time to [clone the branch with the SAP S/4HANA Cloud Public Edition integration](../erp-integration), [the Service Broker branch](../ServiceBroker) or [clone the branch with the GenAI feature](../ai-integration) implemented. To do that, follow these steps:
> Note
> Cloning is optional in case you could finish all your tasks within time you can directly jump to point 2.

1. Clone the application into your SAP Business Application Studio.
    1. In SAP Business Application Studio, open the **Command Palette** and enter *Git: Clone*.
    2. Enter the repository URL for [SAP S/4HANA Cloud Public Edition Integration](../erp-integration), [Service Broker](../ServiceBroker) or the branch with the [GenAI feature](../ai-integration) and hit **Enter**.
2. In the terminal, navigate to the Partner Reference Application and execute the following commands in the required folders:
     You're in the root folder of the project.
    1. Run the following command to install the npm packages on the root folder.
    ```
    npm install
    ``` 
    2. Run the following command to install the npm packages for the app/poetryslams subfolder.
    ```
    npm install
    ``` 
    3. Run the following command to install the npm packages for the app/router subfolder.
    ```
    npm install
    ``` 
    4. Run the following command to install the npm packages for the app/visitors subfolder.
    ```
    npm install
    ``` 
    5. Run the following command to install the npm packages for the mtx/sidecar subfolder.
    ```
    npm install
    ``` 
    6. ONLY REQUIRED WITH EXERCISE 4: Run the following command to install the npm packages for the broker subfolder.
     ```
    npm install
    ```    
    7. Run the following command to build the project. The *archive.mtar* is added to the *mta_archives* folder. 
    ```
    npm run build
    ``` 
3. To deploy your application, execute the following commands:
    1. Open a new terminal and log on to SAP BTP Cloud Foundry runtime: 
	2. Run the following command to log in: 
        ```
        cf login -a <API endpoint URL> --origin <Origin Key of your Identity Provider>
        ```
	3. Enter your development user and password.
	4. Select the org of the SAP BTP provider subaccount for the application. 
	5. Select the SAP BTP Cloud Foundry runtime space (*app*).
    6. To deploy the application, run the following command: 
    ```
    npm run deploy
    ``` 
    8. After you've done all steps above, you can continue with [adding the service broker](/Tutorials/ex4/4.1-Multi-Tenancy-Service-Broker.md). Additionally, you can choose to go one with adding [generative artificial intelligence capabilities](/Tutorials/ex5/5-Multi-Tenancy-Features-GenAI.md) or implementing the [SAP Document AI feature](/Tutorials/ex5.1/5.1-Multi-Tenancy-Features-Document-AI.md). If you've already finished exercise 4/5 and added generative artificial intelligence or SAP Document AI, you can now start exploring your Partner Reference Application.

## Code of Conduct

Please read the [SAP Open Source Code of Conduct](https://github.com/SAP-samples/.github/blob/main/CODE_OF_CONDUCT.md).

## License

Copyright (c) 2026 SAP SE or an SAP affiliate company. All rights reserved. This project is licensed under the Apache Software License, version 2.0 except as noted otherwise in the [LICENSE](LICENSES/Apache-2.0.txt) file.
