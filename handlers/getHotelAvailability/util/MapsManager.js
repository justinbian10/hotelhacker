import {Client} from "@googlemaps/google-maps-services-js";

export default class MapsManager {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async getLatLng(location) {
        const geocodeArgs = {
            params: {
                key: this.apiKey,
                address: location,
            }
        }
        const client = new Client();
        const gcResponse = await client.geocode(geocodeArgs);
        return gcResponse.data.results[0].geometry.location;
    }
}
