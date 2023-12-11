const { Client } = require("pg");
const fs = require('fs');
const PropertiesReader = require('properties-reader');

const properties = PropertiesReader(__dirname + '/../application.properties.ini');

console.log("Properties file " + __dirname + '/../application.properties.ini');
class PostgresEmbeddingsService {

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
        this.#dbClient = new Client(this.#dbEndpoint);

        await this.#dbClient.connect();

        console.log("Connected to Postgres");
    }

    async searchPlaces(prompt, matchThreshold, matchCnt) {
        prompt = prompt.replace(/\n/g, ' ');

        const res = await this.#dbClient.query(
            "WITH prompt AS (" +
            "SELECT (SELECT azure_openai.create_embeddings($1, $2))::vector as embedding" +
            ")" +
            "SELECT name, description, price, 1 - (description_embedding <=> (select embedding from prompt)) as similarity " +
            "FROM airbnb_listing WHERE 1 - (description_embedding <=> (select embedding from prompt)) > $3 " +
            "ORDER BY description_embedding <=> (select embedding from prompt) LIMIT $4",
            [properties.get('AZURE_EMBEDDING_MODEL_DEPLOYMENT_NAME'), prompt, matchThreshold, matchCnt]);

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

module.exports.PostgresEmbeddingsService = PostgresEmbeddingsService;