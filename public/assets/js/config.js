/* ============================================================
   AquaIndex site configuration — edit this file only.
   ============================================================ */
window.AQX_CONFIG = {

  /* Prelaunch registration.
     The "Join Prelaunch" buttons open the registration form
     (name, email, organization); each registration is emailed to
     the AquaIndex inbox by the backend (POST /api/contact — the
     recipient is set there, in the CONTACT_TO app setting).
     contactUrl is the fallback: it is where the buttons point if
     the form cannot open, and the address offered if sending
     fails. Set contactForm to false to skip the form and use
     contactUrl directly.                                        */
  contactUrl: 'mailto:info@aqua-index.com?subject=WaterToken%20prelaunch',
  contactForm: true,

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
  refreshMs: 5 * 60 * 1000,

  /* Price API that serves the assets and price history entered at
     /admin. '/api' is the Azure Static Web Apps backend that ships
     with this repo (see api/). If it cannot be reached the hero
     chart falls back to data/aquaindex-global.csv.                */
  apiBase: '/api'

};
