# Airbnb Recommendation Service Using pgvector and azure_ai

This is a sample Node.JS and React application that demonstrates how to build generative AI applications using the Azure Database for PostgreSQL and its two extensions - pgvector and azure_ai.

The app recommends Airbnb listings for travelers going to San Francisco. It supports two distinct modes:

![azure_openao_lodging](https://github.com/dmagda/pgvector-azure-ai-lodging-service/assets/1537233/7e526933-7e1a-42c6-aa3c-81cacfa7f24a)

* *Azure OpenAI Chat Mode*: In this mode, the Node.js backend leverages one of the Azure GPT models to generate lodging recommendations based on the user's input.
* *Postgres Embeddings Mode*: Initially, the backend employs an Azure OpenAI Embeddings model to convert the user's prompt into an embedding (a vectorized representation of the text data). Subsequently, the server uses the pgvector and azure_ai extensions to find the most relevant listings for a provided user prompt.

## Prerequisites

* A Microsoft Azure subscription.
* The latest [Node.js version](https://github.com/nodejs/release#release-schedule).

## Start Azure Database for PostgreSQL

Set up an instance of the Azure Database for PostgreSQL and enable required extensions:

1. Start a Postgres instance of version 15th or later: https://azure.microsoft.com/en-us/products/postgresql/

2. Once the instance is started, go to the `Networking` tab:
    ![pg-network](https://github.com/dmagda/pgvector-azure-ai-lodging-service/assets/1537233/68d65f09-bcb2-49b5-aa88-753f835a22e0)

    * Add your machine's IP address to the IP allow list
    * Download the SSL certificate that is necessary for secured connections between the application and database.

3. Go to the `Server parameters` tab:
    ![pg-extensions](https://github.com/dmagda/pgvector-azure-ai-lodging-service/assets/1537233/9f16aa55-b815-4157-af46-8d6b2f438827)

    * Add the `AZURE_AI` extension to the `azure.extensions` setting.
    * Add the `VECTOR` extension to the `azure.extensions` setting.

## Start Azure OpenAI Service

Create an instance of the Azure OpenAI Service following this guide:
https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal

Deploy an embedding model under the name of `embedding-model` and a gpt model naming it `gpt-model`:
https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource?pivots=web-portal#deploy-a-model

![azure-models](https://github.com/dmagda/pgvector-azure-ai-lodging-service/assets/1537233/193884c1-2af0-42ff-a4c5-f996bce9538d)

## Download and Configure Application

Download the application and provide settings specific to your instance of the Azure OpenAI Service:

1. Clone the repository:
    ```shell
    git clone https://github.com/dmagda/pgvector-azure-ai-lodging-service
    ```
2. Initialize the project:
    ```shell
    cd {project_dir}/backend
    npm init 

    cd {project_dir}/frontend
    npm init 
    ```
3. Open the `{project_dir}/application.properties.ini` file and fill in the Azure specific settings:
    ```properties
    # Azure OpenAI settings
    AZURE_OPENAI_KEY= # The Azure OpenAI API key
    AZURE_OPENAI_ENDPOINT= # An endpoint for the Language APIs
    AZURE_GPT_MODEL_DEPLOYMENT_NAME = gpt-model
    AZURE_EMBEDDING_MODEL_DEPLOYMENT_NAME = embedding-model

    # Azure Database for PostgreSQL settings
    DATABASE_HOST= # host name
    DATABASE_PORT=5433
    DATABASE_NAME=postgres
    DATABASE_USER= # user name
    DATABASE_PASSWORD= # password
    DATABASE_CA_CERT_FILE= # path to the CA certificate file (downloaded lated in this guide)
    ```

## Load Airbnb Data Set and Set Up Extensions

Next, load the sample Airbnb data set for the properties in San Francisco. The schema and data are located in the `{project_dir}/sql` directory of this project:
1. Connect to the database using psql or another SQL tool:
    ```shell
    psql "host={azure-database-host} port=5432 user={azure-database-username} sslrootcert={azure-database-path-to-ca-certificate} sslmode=require"
    ```
2. Create the database schema:
    ```shell
    \i {project_dir}/sql/0_airbnb_listings.sql
    ```
3. Load the data:
    ```shell
    \copy airbnb_listing from '{project_dir}/sql/sf_airbnb_listings.csv' DELIMITER ',' CSV HEADER;
    ```
4. Execute the following script to create the pgvector and azure_ai extensions, and to add the `description_embedding` to the table:
    ```shell
    \i {project_dir}/sql/1_airbnb_embeddings.sql
    ```
5. Provide your Azure OpenAI enpoint and key to the azure_ai extension:
    ```sql
    select azure_ai.set_setting('azure_openai.endpoint','{azure-openai-endpoint}');
    select azure_ai.set_setting('azure_openai.subscription_key','{azure-openai-key}');
    ```

## Generate Embeddings for Airbnb Listing Descriptions

Airbnb properties provide a detailed property description (rooms number, amenities, location and other perks) in the `description` column. That information is a perfect fit for the similarity search against user prompts. However, the text data of the `description` column needs to be transformed into a vectorized representation.

Use the `embeddings_generator.js` tool to generate embeddings for all Arbnb properties descriptions. The tool leverages the Azure OpenAI Embedding model and stores the generated vectors in the `description_embedding` column in the database:

```shell
node {project_dir}backend/embeddings_generator.js
```

It can take 10+ minutes to generate embeddings for over 7000 Airbnb properties. You'll see the message below once the generation is over:
```shell
....
Processing rows starting from 34746755
Processed 7551 rows
Processing rows starting from 35291912
Finished generating embeddings for 7551 rows
```

## Starting the Application

1. Start the Node.js backend:
    ```shell
    cd {project_dir}/backend
    npm start
    ```
2. Start the React frontend:
    ```shell
    cd {project_dir}/backend
    npm start
    ```

3. Access the application's user interface at:
    http://localhost:3000

Enjoy exploring the app and toggling between the two modes: *Azure OpenAI Chat* and *YugabyteDB Embeddings*. The latter is significantly faster.

![app_screenshot](https://github.com/YugabyteDB-Samples/yugabytedb-azure-openai-lodging-service/assets/1537233/02014aa2-d240-421f-b38c-98f380546a56)

Here are some sample prompts to get you started:
```
We're traveling to San Francisco from October 21st through 28th. We need a hotel with parking.

I'm looking for an apartment near the Golden Gate Bridge with a nice view of the Bay.

I'd like a hotel near Fisherman's Wharf with a Bay view.

An apartment close to the Salesforce Tower, within walking distance of Blue Bottle Coffee.
```
