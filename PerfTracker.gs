/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * Global variables
 */
const SITES_TAB = 'Sites'
const RESULTS_TAB = 'Results'
const HOW_TO_TAB = 'How to Use'


/**
 * Builds the main menu when opening the spreadsheet
 */
function onOpen() {
  let spreadsheet = SpreadsheetApp.getActive()
  let menuEntries = [{
    name: 'Run tests manually',
    functionName: 'runPerfTracker'
  }]
  spreadsheet.addMenu('PerfTracker', menuEntries)
}


/**
 * Reads URL, Label and Device information
 *
 * @return Array with all the information for each URL
 * @customfunction
 */
function getSiteURLs() {
  let spreadsheet = SpreadsheetApp.getActive()
  let sheet = spreadsheet.getSheetByName(SITES_TAB)
  let lastRow = sheet.getLastRow()
  // Limiting the number of URLs to 15 due to AppScript's memory limitations
  if (lastRow > 15) {
    lastRow = 15
  }
  let range = sheet.getRange(2, 1, lastRow - 1, 3)
  let values = range.getValues()
  return values
}


/**
 * Reads PSI API Key
 *
 * @return String with the API Key
 * @customfunction
 */
function getKey() {
  let spreadsheet = SpreadsheetApp.getActive()
  let sheet = spreadsheet.getSheetByName(HOW_TO_TAB)
  let key = sheet.getRange('A5').getValue()
  if (key === '') {
    SpreadsheetApp.getUi().alert('Please enter your API Key')
    return
  }
  return key
}


/**
 * Builds fetch URLs and submits the tests
 *
 * @return Array with all the API responses
 * @customfunction
 */
function submitTests() {
  // Get, Build & Fetch URLs (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#request)
  let key = getKey()
  let categories = 'category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=PWA&category=SEO'
  let values = getSiteURLs()
  let serverURLs = []
  for (let row in values) {
    let url = values[row][0]
    let device = values[row][2]
    let serverURL = {
      'url': `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${categories}&strategy=${device}&url=${url}&key=${key}`,
      'muteHttpExceptions': true
    }
    serverURLs.push(serverURL)
  }
  let responses = UrlFetchApp.fetchAll(serverURLs)
  return responses
}


/**
 * Triggers the tests and outputs data
 *
 * @customfunction
 */
function runPerfTracker() {
  let spreadsheet = SpreadsheetApp.getActive()
  let sheet = spreadsheet.getSheetByName(RESULTS_TAB)
  let today = new Date().toJSON().slice(0, 10)

  // Submit the test
  let responses = submitTests()

  for (let i = 0; i < responses.length; i++) {
    let values = getSiteURLs()
    let url = values[i][0]
    let label = values[i][1]
    let device = values[i][2]

    // Pull data
    let content = JSON.parse(responses[i].getContentText())
    if (content.error == null) {
      let results = getResults(content)
      let resultsData = [].concat([url, label, device, today], results.data)
      sheet.appendRow(resultsData)
      let note = null
      if (results.crux_data === false) {
        note = 'Not enough CrUX data for this URL or domain.'
      } else if (results.origin_fallback === true) {
        note = 'API falled back to show origin data due to the lack of data for this URL.'
      }
      addNote(note, null)
    } else {
      sheet.appendRow([url, label, device])
      addNote(`${content.error.message}\nIf this error persists, investigate the cause by running the URL manually via https://developers.google.com/speed/pagespeed/insights/`, '#fdf6f6')
    }
  }
}


/**
 * Processes API response
 *
 * @param {object} content The JSON object to parse
 * @return Object with post-processed array data and two flags
 * @customfunction
 */
function getResults(content) {
  // Initiate results variable
  let results = {
    data: null,
    crux_data: false,
    origin_fallback: false
  }

  // Process data (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#response)
  let lighthouseResult = content.lighthouseResult
  let loadingExperience = content.loadingExperience
  let originLoadingExperience = content.originLoadingExperience

  // Lighthouse Categories
  let categories = [
    lighthouseResult['categories']['performance']['score'] * 100,
    lighthouseResult['categories']['accessibility']['score'] * 100,
    lighthouseResult['categories']['best-practices']['score'] * 100,
    lighthouseResult['categories']['pwa']['score'] * 100,
    lighthouseResult['categories']['seo']['score'] * 100
  ]

  // Lighthouse Metrics
  let metrics = [
    lighthouseResult['audits']['server-response-time']['numericValue'],
    lighthouseResult['audits']['first-contentful-paint']['numericValue'],
    lighthouseResult['audits']['speed-index']['numericValue'],
    lighthouseResult['audits']['largest-contentful-paint']['numericValue'],
    lighthouseResult['audits']['interactive']['numericValue'],
    lighthouseResult['audits']['total-blocking-time']['numericValue'],
    lighthouseResult['audits']['cumulative-layout-shift']['numericValue']
  ]

  // Lighthouse Assets
  let assets = []
  for (let i = 0; i <= 8; i++) {
    assets.push(lighthouseResult['audits']['resource-summary']['details']['items'][i]['transferSize'] / 1024)
    assets.push(lighthouseResult['audits']['resource-summary']['details']['items'][i]['requestCount'])
  }

  // Lighthouse Version
  let version = lighthouseResult['lighthouseVersion']

  // CrUX
  //
  let crux = []
  if (loadingExperience) {
    results.crux_data = true
    crux = [
      // Overall categorization
      loadingExperience['overall_category'],
      // FCP
      loadingExperience['metrics']['FIRST_CONTENTFUL_PAINT_MS']['percentile'],
      loadingExperience['metrics']['FIRST_CONTENTFUL_PAINT_MS']['category'],
      loadingExperience['metrics']['FIRST_CONTENTFUL_PAINT_MS']['distributions'][0]['proportion'],
      loadingExperience['metrics']['FIRST_CONTENTFUL_PAINT_MS']['distributions'][1]['proportion'],
      loadingExperience['metrics']['FIRST_CONTENTFUL_PAINT_MS']['distributions'][2]['proportion'],
      // LCP
      loadingExperience['metrics']['LARGEST_CONTENTFUL_PAINT_MS']['percentile'],
      loadingExperience['metrics']['LARGEST_CONTENTFUL_PAINT_MS']['category'],
      loadingExperience['metrics']['LARGEST_CONTENTFUL_PAINT_MS']['distributions'][0]['proportion'],
      loadingExperience['metrics']['LARGEST_CONTENTFUL_PAINT_MS']['distributions'][1]['proportion'],
      loadingExperience['metrics']['LARGEST_CONTENTFUL_PAINT_MS']['distributions'][2]['proportion'],
      // FID
      loadingExperience['metrics']['FIRST_INPUT_DELAY_MS']['percentile'],
      loadingExperience['metrics']['FIRST_INPUT_DELAY_MS']['category'],
      loadingExperience['metrics']['FIRST_INPUT_DELAY_MS']['distributions'][0]['proportion'],
      loadingExperience['metrics']['FIRST_INPUT_DELAY_MS']['distributions'][1]['proportion'],
      loadingExperience['metrics']['FIRST_INPUT_DELAY_MS']['distributions'][2]['proportion'],
      // CLS
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['percentile'] / 100,
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['category'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][0]['proportion'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][1]['proportion'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][2]['proportion']
    ]

    // Check if data fallsback to domain
    // If not sufficient field data for the page, the API responds with Origin Field Data and origin_fallback = true
    if (loadingExperience.origin_fallback) {
      results.origin_fallback = true
    }
  }
  // Put all data together and return
  results.data = [].concat(categories, metrics, assets, version, crux)
  return results
}


/**
 * Adds info note to row
 *
 * @param {string} note The note
 * @param {string} formatColor The color
 * @customfunction
 */
function addNote(note, formatColor) {
  let spreadsheet = SpreadsheetApp.getActive()
  let sheet = spreadsheet.getSheetByName(RESULTS_TAB)
  let lastRow = sheet.getLastRow()
  sheet.getRange(`${lastRow}:${lastRow}`).setBackground(formatColor)
  if (note != null) {
    sheet.getRange(`D${lastRow}`).setNote(note)
  }
}
