/* ============================================================
   AquaIndex site configuration — edit this file only.
   ============================================================ */
window.AQX_CONFIG = {

  /* Where the "Contact" and "Talk to the team" buttons point.
     PLACEHOLDER — replace with the real address, e.g.:
       'mailto:contact@aqua-index.com'
     or a page URL:
       'https://www.aqua-index.com/contact'                      */
  contactUrl: 'mailto:info@aqua-index.com',

  /* Live commodity-futures prices for the ticker.
     Set a provider + API key to activate; leave provider null to
     show the indicative static prices.
       'commoditypriceapi'  — https://commoditypriceapi.com/  (all 12 futures, one request)
       'apininjas'          — https://api-ninjas.com/api/commodityprice  (one request per future)
       'alphavantage'       — https://www.alphavantage.co/  (only Corn, Wheat, Sugar, Coffee,
                              Cotton; monthly values, not streaming)                          */
  pricesProvider: 'commoditypriceapi',
  pricesApiKey: '76b87e4f-5347-4669-b67f-aaa3ab837f1a',

  /* How often to refresh live prices (milliseconds). */
  refreshMs: 5 * 60 * 1000

};
