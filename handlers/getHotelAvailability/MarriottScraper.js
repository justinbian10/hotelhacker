import puppeteer from "puppeteer-extra";
import chromium from '@sparticuz/chromium';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import {getFormattedDate} from "./util/utilFunctions.js";

const NEXT_BUTTON_SELECTOR = 'a[class="t-control-link t-no-decor analytics-click "]'
const POINT_COST_SELECTOR = 'h2[class="t-extend-h3 l-margin-none t-font-l'
    + ' t-font-weight-bold"]'
const DAY_POINT_SECTION_SELECTOR = 'td.available-date-cell'
const DATE_MONTH_SELECTOR = '[class="l-l-display-none t-num-month"]'
const DATE_DAY_SELECTOR = '[class="t-num-day"]'
const DAY_IN_SECONDS = 86400 * 1000;

export default class MarriottScraper {

    async getHotelAvailability(page, months) {
        let datePointMapping = {};
        for (let i = 0; i < months; i++) {
            //await page.waitForTimeout(1000)
            if (i !== 0) {
                await page.waitForSelector(NEXT_BUTTON_SELECTOR, { timeout: 5000 })
                await page.click(NEXT_BUTTON_SELECTOR);
                //await page.waitForTimeout(3000)
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
    async getPointMonthAvailabilityForRange(lat, lng, startDate, endDate) {
        console.log('hi')
        const currDay = getFormattedDate(startDate);
        const nextDay = getFormattedDate(new Date(startDate.getTime() + DAY_IN_SECONDS));

        console.log('hi')
        puppeteer.use(StealthPlugin())
        const userAgent = new UserAgent();
        const browser = await puppeteer.launch({
            executablePath: await chromium.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true,
            args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
        });
        console.log('hi')
        const page = await browser.newPage();
        //await page.setUserAgent(userAgent.toString());
        await page.goto(`https://www.marriott.com/search/findHotels.mi?isInternalSearch=true&vsInitialRequest=false&searchType=InCity&for-hotels-nearme=Near&collapseAccordian=is-hidden&singleSearch=true&isSearch=true&recordsPerPage=20&destinationAddress.latitude=${lat}&destinationAddress.destination=Tokyo,+Japan&searchRadius=80467.2&isTransient=true&destinationAddress.longitude=${lng}&initialRequest=true&fromDate=${currDay}&toDate=${nextDay}&flexibleDateSearch=true&isHideFlexibleDateCalendar=false&isFlexibleDatesOptionSelected=on&lengthOfStay=1&roomCount=1&numAdultsPerRoom=1&childrenCount=0&clusterCode=none&useRewardsPoints=true`)
        await page.waitForSelector('a.view-rates-button-container')
        const viewRatesButtons = await page.$$eval('a.view-rates-button-container', els => els.map(el => el.href));
        console.log(viewRatesButtons);
        let hotelCostsMap = {};
        for (const viewRatesButton of viewRatesButtons) {
            const hotelCalendarPage = await browser.newPage();
            await hotelCalendarPage.goto(viewRatesButton);
            await hotelCalendarPage.waitForSelector('span[itemprop=name]')
            const hotelName = await hotelCalendarPage.$eval('span[itemprop=name]', el => el.textContent);
            hotelCostsMap[hotelName] = await this.getHotelAvailability(hotelCalendarPage, endDate.getMonth() - startDate.getMonth());
        }
        const hotelCosts = await Promise.all(Object.values(hotelCostsMap));
        const result = Object.fromEntries(Object.keys(hotelCostsMap).map((key, index) => [key, hotelCosts[index]]))

        console.log(result);
        await browser.close();

        return result;
    }
}
