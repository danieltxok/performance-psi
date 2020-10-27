/**
 * Globals
 */
var SITES_TAB = 'Sites'
var RESULTS_TAB = 'Results'
var HOW_TO_TAB = 'How to Use'


/**
* Builds the main menu when opening the spreadsheet
*/
function onOpen() {
  var spreadsheet = SpreadsheetApp.getActive()
  var menuEntries = [
    {name: 'Run tests manually', functionName: 'runPerfTracker'}
  ]
  spreadsheet.addMenu('PerfTracker', menuEntries)
}


/**
* Reads URL, Label and Device information
*
* @return Array with all the information for each URL
* @customfunction
*/
function getSiteURLs(){
  var spreadsheet = SpreadsheetApp.getActive()
  var sheet = spreadsheet.getSheetByName(SITES_TAB)
  var range = sheet.getRange(2, 1, sheet.getLastRow()-1, 3)
  var values = range.getValues()
  return values
}


/**
* Reads PSI API Key
*
* @return String with the API Key
* @customfunction
*/
function getKey(){
  var spreadsheet = SpreadsheetApp.getActive()
  var sheet = spreadsheet.getSheetByName(HOW_TO_TAB)
  var key = sheet.getRange('A5').getValue()
  if (key == '') {
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
  var key = getKey()
  var categories = 'category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=PWA&category=SEO'
  var values = getSiteURLs()
  var serverURLs = []
  for (var row in values) {
    var url = values[row][0]
    var device = values[row][2]
    var serverURL = {
      'url': 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + categories + '&strategy=' + device + '&url=' + url + '&key=' + key,
      'muteHttpExceptions': true
    }
    serverURLs.push(serverURL)
  }
  var responses = UrlFetchApp.fetchAll(serverURLs)
  return responses
}


/**
* Triggers the tests and outputs data
*
* @customfunction
*/
function runPerfTracker() {
  var spreadsheet = SpreadsheetApp.getActive()
  var sheet = spreadsheet.getSheetByName(RESULTS_TAB)
  
  var today =  new Date().toJSON().slice(0,10)
  
  // Submit the test
  var responses = submitTests()
  
  for (var i = 0; i < responses.length; i++) {
    var values = getSiteURLs()
    var url = values[i][0]
    var label = values[i][1]
    var device = values[i][2]

    // Pull data
    var content = JSON.parse(responses[i].getContentText())
    var lastRow = sheet.getLastRow() + 1
    if (content.error == null) {
      var results = [].concat([url, label, device, today], getResults(content))
      sheet.appendRow(results)
      sheet.getRange(lastRow + ':' + lastRow).setBackground(null);
    } else {
      sheet.appendRow([url, label, device])
      sheet.getRange(lastRow + ':' + lastRow).setBackground('#fdf6f6')
      sheet.getRange('D' + lastRow).setNote(content.error.message + '.\nIf this error persists, investigate the cause by running the URL manually via https://developers.google.com/speed/pagespeed/insights/')
    }    
 }  
}


/**
* Processes API response
*
* @return Array with the post-processed response
* @customfunction
*/
function getResults(content){
  // Process data (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#response)
  var lighthouseResult = content.lighthouseResult
  var loadingExperience = content.loadingExperience
  var originLoadingExperience = content.originLoadingExperience
  
  // Lighthouse Categories
  var categories = [
    lighthouseResult['categories']['performance']['score']*100,
    lighthouseResult['categories']['accessibility']['score']*100,
    lighthouseResult['categories']['best-practices']['score']*100,
    lighthouseResult['categories']['pwa']['score']*100,
    lighthouseResult['categories']['seo']['score']*100
  ]
  
  // Lighthouse Metrics
  var metrics = [
    lighthouseResult['audits']['server-response-time']['numericValue'],
    lighthouseResult['audits']['first-contentful-paint']['numericValue'],
    lighthouseResult['audits']['speed-index']['numericValue'],
    lighthouseResult['audits']['largest-contentful-paint']['numericValue'],
    lighthouseResult['audits']['interactive']['numericValue'],
    lighthouseResult['audits']['total-blocking-time']['numericValue'],
    lighthouseResult['audits']['cumulative-layout-shift']['numericValue']
  ]
  
  // Lighthouse Assets
  var assets = [
    // Total 
    lighthouseResult['audits']['resource-summary']['details']['items'][0]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][0]['requestCount'],
    // Script 
    lighthouseResult['audits']['resource-summary']['details']['items'][1]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][1]['requestCount'],
    // Image 
    lighthouseResult['audits']['resource-summary']['details']['items'][2]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][2]['requestCount'],
    // Stylesheet 
    lighthouseResult['audits']['resource-summary']['details']['items'][3]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][3]['requestCount'],
    // Document 
    lighthouseResult['audits']['resource-summary']['details']['items'][4]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][4]['requestCount'],
    // Font 
    lighthouseResult['audits']['resource-summary']['details']['items'][5]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][5]['requestCount'],
    // Other 
    lighthouseResult['audits']['resource-summary']['details']['items'][6]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][6]['requestCount'],
    // Media 
    lighthouseResult['audits']['resource-summary']['details']['items'][7]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][7]['requestCount'],
    // Third-party
    lighthouseResult['audits']['resource-summary']['details']['items'][8]['transferSize']/1024,
    lighthouseResult['audits']['resource-summary']['details']['items'][8]['requestCount']
  ]
  
  // Lighthouse Version
  var version = lighthouseResult['lighthouseVersion']
  
  // CrUX
  //
  // If not sufficient field data for the page, the API responds with Origin Field Data
  if (loadingExperience.metrics) { // Only when there is some CrUX data
    var crux = [
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
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['percentile']/100,
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['category'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][0]['proportion'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][1]['proportion'],
      loadingExperience['metrics']['CUMULATIVE_LAYOUT_SHIFT_SCORE']['distributions'][2]['proportion']
    ]
  }
 
  // Put all data together
  var results = [].concat(categories, metrics, assets, version, crux)
  return results
}
