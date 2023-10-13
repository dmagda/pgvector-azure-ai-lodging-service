const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const PropertiesReader = require('properties-reader');

const properties = PropertiesReader(__dirname + '/../application.properties.ini');

class OpenAIChatService {
    #azureOpenAi;

    #gptModel;

    constructor() { }

    connect() {
        this.#azureOpenAi = new OpenAIClient(properties.get('AZURE_OPENAI_ENDPOINT'),
            new AzureKeyCredential(properties.get('AZURE_OPENAI_KEY')));

        this.#gptModel = properties.get('AZURE_GPT_MODEL_DEPLOYMENT_NAME');
    }

    async searchPlaces(prompt) {
        const messages = [
            {
                role: "system", content:
                    "You're a helpful assistant that helps to find lodging in San Francisco. Suggest three options. Send back a JSON object in the format below." +
                    "[{\"name\": \"<hotel name>\", \"description\": \"<hotel description>\", \"price\": <hotel price>}]" +
                    "Don't add any other text to the response."
            },
            {
                role: "user", content: prompt
            }];

        const chatCompletion = await this.#azureOpenAi.getChatCompletions(this.#gptModel, messages);

        const message = chatCompletion.choices[0].message.content;
        const jsonStart = message.indexOf('[');
        const jsonEnd = message.indexOf(']');

        const places = JSON.parse(message.substring(jsonStart, jsonEnd + 1));

        console.log(places);

        return places;
    }
}

module.exports.OpenAIChatService = OpenAIChatService;