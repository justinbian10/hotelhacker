import puppeteer from 'puppeteer-extra';
import UserAgent from 'user-agents';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { Client } from '@googlemaps/google-maps-services-js';

if (process.argv.length < 3) {
  throw Error();
}
const getFormattedDate = (date) => {
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return month + '/' + day + '/' + year;
}

const currDay = getFormattedDate(new Date());
const nextDay = getFormattedDate(new Date(new Date().getTime() + 86400 * 1000));

const geocodeArgs = {
  params: {
    key: 'AIzaSyCtDRwy2W_XPFm2lFMrol-hBASUwHRhgmY',
    address: process.argv.splice(2).join(' '),
  }
}
const client = new Client();
const gcResponse = await client.geocode(geocodeArgs);
const requestedLatLng = gcResponse.data.results[0].geometry.location;

puppeteer.use(StealthPlugin())


const NEXT_BUTTON_SELECTOR = 'a[class="t-control-link t-no-decor analytics-click "]'
const POINT_COST_SELECTOR = 'h2[class="t-extend-h3 l-margin-none t-font-l'
    + ' t-font-weight-bold"]'
const DAY_POINT_SECTION_SELECTOR = 'td.available-date-cell'
const DATE_MONTH_SELECTOR = '[class="l-l-display-none t-num-month"]'
const DATE_DAY_SELECTOR = '[class="t-num-day"]'
const getHotelAvailability = async (page, months) => {
  let datePointMapping = {};
  for (let i = 0; i < months; i++) {
    await page.waitForTimeout(1000)
    if (i !== 0) {
      await page.waitForSelector(NEXT_BUTTON_SELECTOR)
      await page.click(NEXT_BUTTON_SELECTOR);
      await page.waitForTimeout(3000)
    }
    try {
      await page.waitForSelector(POINT_COST_SELECTOR, { timeout: 5000 })
      const dayPointSections = await page.$$(DAY_POINT_SECTION_SELECTOR)

      for (let dayObject of dayPointSections) {
        const monthVal = await (await dayObject.$(
            DATE_MONTH_SELECTOR)).evaluate(el => el.textContent);
        const dayVal = await (await dayObject.$(DATE_DAY_SELECTOR)).evaluate(
            el => el.textContent);
        datePointMapping[monthVal + dayVal] = (await (await dayObject.$(
            POINT_COST_SELECTOR)).evaluate(el => el.textContent)) || 0;
      }
    } catch {
    }
  }
  return datePointMapping;
}

const userAgent = new UserAgent();
const browser = await puppeteer.launch({
  headless: false,
})

const page = await browser.newPage();
await page.setUserAgent(userAgent.toString());
await page.goto(`https://www.marriott.com/search/findHotels.mi?isInternalSearch=true&vsInitialRequest=false&searchType=InCity&for-hotels-nearme=Near&collapseAccordian=is-hidden&singleSearch=true&isSearch=true&recordsPerPage=20&destinationAddress.latitude=${requestedLatLng.lat}&destinationAddress.destination=Tokyo,+Japan&searchRadius=80467.2&isTransient=true&destinationAddress.longitude=${requestedLatLng.lng}&initialRequest=true&fromDate=${currDay}&toDate=${nextDay}&flexibleDateSearch=true&isHideFlexibleDateCalendar=false&isFlexibleDatesOptionSelected=on&lengthOfStay=1&roomCount=1&numAdultsPerRoom=1&childrenCount=0&clusterCode=none&useRewardsPoints=true`)
await page.waitForSelector('a.view-rates-button-container')
const viewRatesButtons = await page.$$eval('a.view-rates-button-container', els => els.map(el => el.href));
console.log(viewRatesButtons)
let hotelCostsMap = {};
for (const viewRatesButton of viewRatesButtons) {
  const hotelCalendarPage = await browser.newPage();
  await hotelCalendarPage.goto(viewRatesButton);
  await hotelCalendarPage.waitForSelector('span[itemprop=name]')
  const hotelName = await hotelCalendarPage.$eval('span[itemprop=name]', el => el.textContent);
  hotelCostsMap[hotelName] = await getHotelAvailability(hotelCalendarPage, 2);
}
const hotelCosts = await Promise.all(Object.values(hotelCostsMap));
const result = Object.fromEntries(Object.keys(hotelCostsMap).map((key, index) => [key, hotelCosts[index]]))

console.log(result);
await browser.close();
