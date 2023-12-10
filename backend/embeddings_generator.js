const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { Client } = require("pg");
const fs = require('fs');
const { checkEmbeddingValid } = require("./embeddings_utils.js");

const PropertiesReader = require('properties-reader');

const properties = PropertiesReader(__dirname + '/../application.properties.ini');

const azureOpenAi = new OpenAIClient(properties.get('AZURE_OPENAI_ENDPOINT'),
    new AzureKeyCredential(properties.get('AZURE_OPENAI_KEY')));

const embeddingModel = properties.get('AZURE_EMBEDDING_MODEL_DEPLOYMENT_NAME');

const dbEndpoint = {
    host: properties.get('DATABASE_HOST'),
    port: properties.get('DATABASE_PORT'),
    database: properties.get('DATABASE_NAME'),
    user: properties.get('DATABASE_USER'),
    password: properties.get('DATABASE_PASSWORD'),
    ssl: {
        ca: fs.readFileSync(properties.get('DATABASE_CA_CERT_FILE'))
    }
};

async function main() {
    const dbClient = new Client(dbEndpoint);
    await dbClient.connect();

    console.log("Connected to PostgreSQL database");

    let id = 0;
    let length = 0;
    let totalCnt = 0;

    try {
        do {
            console.log(`Processing rows starting from ${id}`);
            const res = await dbClient.query(
                "SELECT id, description FROM airbnb_listing " +
                "WHERE id >= $1 and description IS NOT NULL ORDER BY id LIMIT 200", [id]);
            length = res.rows.length;
            let rows = res.rows;

            if (length > 0) {
                for (let i = 0; i < length; i++) {
                    const description = rows[i].description.replace(/\*|\n/g, ' ');

                    id = rows[i].id;

                    const embeddingResp = await azureOpenAi.getEmbeddings(embeddingModel, description);

                    if (!checkEmbeddingValid(embeddingResp))
                        return;

                    const res = await dbClient.query("UPDATE airbnb_listing SET description_embedding = $1 WHERE id = $2",
                        ['[' + embeddingResp.data[0].embedding + ']', id]);

                    totalCnt++;
                }

                id++;

                console.log(`Processed ${totalCnt} rows`);
            }
        } while (length != 0);
    } catch (err) {
        console.log(err);
    }
    console.log(`Finished generating embeddings for ${totalCnt} rows`);
    process.exit(0);
}

main();