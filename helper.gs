/**
 * Copyright 2021 Google LLC
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
 * Builds the main menu when opening the spreadsheet
 */
function onOpen() {
  const menuEntries = [{
    name: 'Run tests manually',
    functionName: 'runPerfTracker'
  }]
  SPREADSHEET.addMenu('PerfTracker', menuEntries)
}


/**
 * Reads PSI API Key
 *
 * @return String with the API Key
 */
function getKey() {
  const sheet = SPREADSHEET.getSheetByName(HOW_TO_TAB)
  const key = sheet.getRange('A5').getValue()
  if (key === '') {
    SpreadsheetApp.getUi().alert('Please enter your API Key')
    return
  }
  return key
}


/**
 * Clones Sites tab to create the queue
 */
function cloneSitesSheet() {
  // Delete any previous copy
  const old = SPREADSHEET.getSheetByName(TEMP_QUEUE_TAB)
  if (old) SPREADSHEET.deleteSheet(old)
  const queue = SPREADSHEET.getSheetByName(SITES_TAB).copyTo(SPREADSHEET)
  queue.setName(TEMP_QUEUE_TAB)
  queue.hideSheet()
}


/**
 * Sets trigger to run tests from queue
 *
 * @param {integer} seconds The seconds after the current time
 */
function setTrigger(seconds) {
  ScriptApp.newTrigger('runBatchFromQueue').timeBased().after(seconds * 1000).create()
}


/**
 * Deletes triggers by handler function
 *
 * @param {string} functionName The name of the function run by the trigger
 */
function deleteTriggers(functionName) {
  const allTriggers = ScriptApp.getProjectTriggers()
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(allTriggers[i])
    }
  }
}


/**
 * Triggers the tests and outputs data
 */
function runBatchFromQueue() {
  // Gets batch of URLs
  const URLsettings = getURLSettings()

  // Submits the tests
  const responses = submitTests(URLsettings)

  // Outputs data
  const sheet = SPREADSHEET.getSheetByName(RESULTS_TAB)
  const today = new Date().toJSON().slice(0, 10)
  for (let i = 0; i < responses.length; i++) {
    let url = URLsettings[i][0]
    let label = URLsettings[i][1]
    let device = URLsettings[i][2]

    // Pulls data
    let content = JSON.parse(responses[i].getContentText())
    if (content.error == null) {
      let results = parseResults(content)
      let resultsData = [].concat([url, label, device, today], results.data)
      sheet.appendRow(resultsData)
      let note = null
      if (results.crux_data === false) {
        note = 'Not enough CrUX data.\n\nThe CrUX Report does not have enough data for this URL or domain.'
      } else if (results.origin_fallback === true) {
        note = 'Not enough CrUX data.\n\nThe CrUX Report does not have enough data for this URL and it fell back to showing data for the origin.'
      }
      addNote(note, null)
    } else {
      sheet.appendRow([url, label, device])
      note = `${content.error.message}\n\nIf this error persists, investigate the cause by running the URL manually via https://developers.google.com/speed/pagespeed/insights/`
      addNote(note, '#fdf6f6')
    }
  }
}


/**
 * Reads URL, Label and Device information and then deletes them from queue
 *
 * @return Array with all the settings for each URL
 */
function getURLSettings() {
  const sheet = SPREADSHEET.getSheetByName(TEMP_QUEUE_TAB)
  let last_row = sheet.getLastRow() - 1
  if (sheet.getLastRow() > TESTS_PER_BATCH + 1) {
    last_row = TESTS_PER_BATCH
    setTrigger(100)
  }
  const range = sheet.getRange(2, 1, last_row, 3)
  const settings = range.getValues()
  sheet.deleteRows(2, last_row);
  return settings
}


/**
 * Builds fetch URLs and submits the tests in parallel
 *
 * @param {array} settings The URL settings for all tests
 * @return Array with all the API responses
 */
function submitTests(settings) {
  // Gets, Builds & Fetches URLs (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#request)
  const key = getKey()
  const categories = 'category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=PWA&category=SEO'
  const serverURLs = []
  for (let item in settings) {
    let url = settings[item][0]
    let device = settings[item][2]
    let serverURL = {
      'url': `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${categories}&strategy=${device}&url=${url}&key=${key}`,
      'muteHttpExceptions': true
    }
    serverURLs.push(serverURL)
  }
  const responses = UrlFetchApp.fetchAll(serverURLs)
  return responses
}


/**
 * Parses API response
 *
 * @param {object} content The JSON object to parse
 * @return Object with post-processed array data and two flags
 */
function parseResults(content) {
  // Initiates allResults variable
  const allResults = {
    data: null,
    crux_data: false,
    origin_fallback: false
  }

  // Processes data (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#response)
  const lighthouseResult = content.lighthouseResult
  const loadingExperience = content.loadingExperience

  // Lighthouse Categories
  const categories = [
    lighthouseResult['categories']['performance']['score'] * 100,
    lighthouseResult['categories']['accessibility']['score'] * 100,
    lighthouseResult['categories']['best-practices']['score'] * 100,
    lighthouseResult['categories']['pwa']['score'] * 100,
    lighthouseResult['categories']['seo']['score'] * 100
  ]

  // Lighthouse Metrics
  const metrics = [
    lighthouseResult['audits']['server-response-time']['numericValue'],
    lighthouseResult['audits']['first-contentful-paint']['numericValue'],
    lighthouseResult['audits']['speed-index']['numericValue'],
    lighthouseResult['audits']['largest-contentful-paint']['numericValue'],
    lighthouseResult['audits']['interactive']['numericValue'],
    lighthouseResult['audits']['total-blocking-time']['numericValue'],
    lighthouseResult['audits']['cumulative-layout-shift']['numericValue']
  ]

  // Lighthouse Assets
  const assets = []
  for (let i = 0; i <= 8; i++) {
    assets.push(lighthouseResult['audits']['resource-summary']['details']['items'][i]['transferSize'] / 1024)
    assets.push(lighthouseResult['audits']['resource-summary']['details']['items'][i]['requestCount'])
  }

  // Lighthouse Version
  const version = lighthouseResult['lighthouseVersion']

  // CrUX
  let crux = []
  if (loadingExperience['metrics']) {
    allResults.crux_data = true
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

    // Checks if data falls back to domain
    // If not sufficient field data for the page, the API responds with Origin Field Data and origin_fallback = true
    if (loadingExperience['origin_fallback']) {
      allResults.origin_fallback = true
    }
  }
  // Puts all data together and returns
  allResults.data = [].concat(categories, metrics, assets, version, crux)
  return allResults
}


/**
 * Adds info note to row
 *
 * @param {string} note The note
 * @param {string} formatColor The color
 */
function addNote(note, formatColor) {
  const sheet = SPREADSHEET.getSheetByName(RESULTS_TAB)
  const lastRow = sheet.getLastRow()
  sheet.getRange(`${lastRow}:${lastRow}`).setBackground(formatColor)
  if (note != null) {
    sheet.getRange(`D${lastRow}`).setNote(note)
  }
}
