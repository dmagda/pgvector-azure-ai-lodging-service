const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { Client } = require("pg");
const fs = require('fs');
const { checkEmbeddingValid } = require("./embeddings_utils.js");
const PropertiesReader = require('properties-reader');

const properties = PropertiesReader(__dirname + '/../application.properties.ini');

console.log("Properties file " + __dirname + '/../application.properties.ini');
class YugabyteDbEmbeddingsService {

    #azureOpenAi;

    #embeddingModel = properties.get('AZURE_EMBEDDING_MODEL_DEPLOYMENT_NAME');

    #dbEndpoint = {
        host: properties.get('DATABASE_HOST'),
        port: properties.get('DATABASE_PORT'),
        database: properties.get('DATABASE_NAME'),
        user: properties.get('DATABASE_USER'),
        password: properties.get('DATABASE_PASSWORD'),
        ssl: {
            ca: fs.readFileSync(properties.get('DATABASE_CA_CERT_FILE'))
        }
    };

    #dbClient;

    constructor() { }

    async connect() {
        this.#azureOpenAi = new OpenAIClient(properties.get('AZURE_OPENAI_ENDPOINT'),
            new AzureKeyCredential(properties.get('AZURE_OPENAI_KEY')));

        this.#dbClient = new Client(this.#dbEndpoint);

        await this.#dbClient.connect();

        console.log("Connected to YugabyteDB");
    }

    async searchPlaces(prompt, matchThreshold, matchCnt) {
        prompt = prompt.replace(/\n/g, ' ');

        const embeddingResp = await this.#azureOpenAi.getEmbeddings(this.#embeddingModel, prompt);

        if (!checkEmbeddingValid(embeddingResp)) {
            return { "error": "Failed to generate an embedding for the prompt" };
        }

        const res = await this.#dbClient.query(
            "SELECT name, description, price, 1 - (description_embedding <=> $1) as similarity " +
            "FROM airbnb_listing WHERE 1 - (description_embedding <=> $1) > $2 ORDER BY description_embedding <=> $1 LIMIT $3",
            ['[' + embeddingResp.data[0].embedding + ']', matchThreshold, matchCnt]);

        let places = [];

        for (let i = 0; i < res.rows.length; i++) {
            const row = res.rows[i];

            places.push(
                { "name": row.name, "description": row.description, "price": row.price, "similarity": row.similarity });

            console.log(`${row.name}, ${row.similarity}, ${row.price} \n ${row.description}`);
            console.log("\n\n--------------------------------------------------");
        }

        return places;
    }
}

module.exports.YugabyteDbEmbeddingsService = YugabyteDbEmbeddingsService;