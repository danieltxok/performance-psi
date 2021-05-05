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
 * Global variables
 */
const HOW_TO_TAB = 'How to Use'
const SITES_TAB = 'Sites'
const TEMP_QUEUE_TAB = 'Queue'
const RESULTS_TAB = 'Results'
const TESTS_PER_BATCH = 5


/**
 * Creates queue and sets new trigger
 */
function runPerfTracker() {
  // Creates queue
  cloneSitesSheet()
  
  // Deletes previously finished triggers
  deleteTriggers('runBatchFromQueue')

  // Sets trigger
  setTrigger(10)
}
