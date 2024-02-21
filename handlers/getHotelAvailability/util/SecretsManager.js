import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";

const SECRET_ID = "prod/hotelhacker/mapsKey";
const REGION = "us-east-1";

class SecretsManager {
    static instance;
    secrets = {};
    constructor() {

    }

    static getInstance() {
        if (!SecretsManager.instance) {
            SecretsManager.instance = new SecretsManager();
        }

        return SecretsManager.instance;
    }

    async getSecret(secretName) {
        if (secretName in this.secrets) {
            return this.secrets[secretName]
        }
        const secretsClient = new SecretsManagerClient({ region: REGION });
        const input = {
            SecretId: SECRET_ID,
        };
        const command = new GetSecretValueCommand(input);
        const response = await secretsClient.send(command);
        this.secrets[secretName] = JSON.parse(response.SecretString)[secretName]
        return this.secrets[secretName]
    }
}
export default SecretsManager;