import { printError } from './helper/utils.js'
import { extensionNamespace as ext } from './model/namespace.js'
import { getEffectiveOptions } from './model/options.js'
import { getSearchData } from './model/searchData.js'
import { search } from './search/common.js'
import { addDefaultEntries } from './search/defaultEntries.js'
import { editBookmark, updateBookmark } from './view/editBookmarkView.js'
import { loadFoldersOverview } from './view/foldersView.js'
import {
  navigationKeyListener,
  renderSearchResults,
  toggleSearchApproach,
  updateSearchApproachToggle,
} from './view/searchView.js'
import { loadTagsOverview } from './view/tagsView.js'

window.ext = ext

//////////////////////////////////////////
// INITIALIZE EXTENSION                 //
//////////////////////////////////////////

// Trigger initialization
ext.initialized = false
initExtension().catch((err) => {
  printError(err, 'Could not initialize Extension')
})

/**
 * Initialize the extension
 * This includes indexing the current bookmarks and history
 */
export async function initExtension() {
  // Load effective options, including user customizations
  ext.opts = await getEffectiveOptions()

  if (ext.opts.debug) {
    performance.mark('init-start')
    console.debug('Initialized with options', ext.opts)
  }

  // HTML Element selectors
  ext.dom.searchInput = document.getElementById('search-input')
  ext.dom.resultList = document.getElementById('result-list')
  ext.dom.resultCounter = document.getElementById('result-counter')
  ext.dom.searchApproachToggle = document.getElementById('search-approach-toggle')

  updateSearchApproachToggle()

  const { bookmarks, tabs, history } = await getSearchData()
  ext.model.tabs = tabs
  ext.model.bookmarks = bookmarks
  ext.model.history = history

  ext.initialized = true

  // Register Events
  document.addEventListener('keydown', navigationKeyListener)
  window.addEventListener('hashchange', hashRouter, false)
  ext.dom.searchApproachToggle.addEventListener('mouseup', toggleSearchApproach)
  ext.dom.searchInput.addEventListener('keyup', search)

  // Display default entries
  await addDefaultEntries()
  renderSearchResults(ext.model.result)
  if (!window.location.hash || window.location.hash === '/') {
    // Placeholder. We could add help-text here.
  } else {
    hashRouter()
  }

  if (document.getElementById('results-loading')) {
    document.getElementById('results-loading').remove()
  }

  if (ext.opts.debug) {
    // Do some performance measurements and log it to debug
    performance.mark('init-end')
    performance.measure('init-end-to-end', 'init-start', 'init-end')
    const initPerformance = performance.getEntriesByType('measure')
    const totalInitPerformance = performance.getEntriesByName('init-end-to-end')
    console.debug('Init Performance: ' + totalInitPerformance[0].duration + 'ms', initPerformance)
    performance.clearMeasures()
  }
}

//////////////////////////////////////////
// GENERAL NAVIGATION                   //
//////////////////////////////////////////

/**
 * URL Hash Router
 */
export async function hashRouter() {
  try {
    const hash = window.location.hash
    closeModals()
    if (!hash || hash === '#') {
      // Index route -> redirect to last known search or empty search
      window.location.hash = '#search/'
    } else if (hash.startsWith('#search/')) {
      // Search specific term
      const searchTerm = hash.replace('#search/', '')
      if (searchTerm) {
        ext.dom.searchInput.value = decodeURIComponent(searchTerm)
      }
      ext.dom.searchInput.focus()
      search()
    } else if (hash.startsWith('#tags/')) {
      loadTagsOverview()
    } else if (hash.startsWith('#folders/')) {
      loadFoldersOverview()
    } else if (hash.startsWith('#edit-bookmark/')) {
      // Edit bookmark route
      const bookmarkId = hash.replace('#edit-bookmark/', '')
      void editBookmark(bookmarkId)
    } else if (hash.startsWith('#update-bookmark/')) {
      // Update bookmark route
      const bookmarkId = hash.replace('#update-bookmark/', '')
      updateBookmark(bookmarkId)
    }
  } catch (err) {
    printError(err)
  }
}

/**
 * Close all modal overlays
 */
export function closeModals() {
  document.getElementById('edit-bookmark').style = 'display: none;'
  document.getElementById('tags-overview').style = 'display: none;'
  document.getElementById('folders-overview').style = 'display: none;'
  document.getElementById('error-list').style = 'display: none;'
}
