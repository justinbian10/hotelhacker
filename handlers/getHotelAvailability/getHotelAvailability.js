import SecretsManager from"./util/SecretsManager.js";
import MapsManager from "./util/MapsManager.js";

import MarriottScraper from "./MarriottScraper.js";

const SECRET_NAME = 'mapsKey'

export const lambdaHandler = async (event, context) => {
  const location = event.queryStringParameters.location;
  const startDate = new Date(event.queryStringParameters.startDate);
  const endDate = new Date(event.queryStringParameters.endDate);

  const apiKey = await SecretsManager.getInstance().getSecret(SECRET_NAME);
  const requestedLatLng = await new MapsManager(apiKey).getLatLng(location);
  const marriottScraper = new MarriottScraper();
  const res = await marriottScraper.getPointMonthAvailabilityForRange(requestedLatLng.lat, requestedLatLng.lng, startDate, endDate)

  try {
    return {
      'statusCode': 200,
      'body': JSON.stringify({
        result: res,
      })
    }
  } catch (err) {
    console.log(err);
    return err;
  }
};