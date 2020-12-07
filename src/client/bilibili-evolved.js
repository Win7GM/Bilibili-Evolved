// ==UserScript==
// @name         Bilibili Evolved (Preview)
// @version      1.11.5
// @description  Bilibili Evolved 的预览版, 可以抢先体验新功能.
// @author       Grant Howard, Coulomb-G
// @copyright    2020, Grant Howard (https://github.com/the1812) & Coulomb-G (https://github.com/Coulomb-G)
// @license      MIT
// @match        *://*.bilibili.com/*
// @exclude      *://api.bilibili.com/*
// @exclude      *://api.*.bilibili.com/*
// @exclude      *://*.bilibili.com/api/*
// @exclude      *://member.bilibili.com/studio/bs-editor/*
// @run-at       document-start
// @updateURL    https://cdn.jsdelivr.net/gh/the1812/Bilibili-Evolved@preview/bilibili-evolved.preview.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/the1812/Bilibili-Evolved@preview/bilibili-evolved.preview.user.js
// @supportURL   https://github.com/the1812/Bilibili-Evolved/issues
// @homepage     https://github.com/the1812/Bilibili-Evolved
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.setClipboard
// @grant        GM.info
// @grant        GM.xmlHttpRequest
// @connect      raw.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @connect      cn.bing.com
// @connect      www.bing.com
// @connect      translate.google.cn
// @connect      translate.google.com
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/jquery@3.4.0/dist/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.15/lodash.min.js
// @require      https://cdn.jsdelivr.net/npm/jszip@3.1.5/dist/jszip.min.js
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.10/dist/vue.js
// @require      https://cdn.jsdelivr.net/npm/vuex@3.1.2/dist/vuex.js
// @icon         https://cdn.jsdelivr.net/gh/the1812/Bilibili-Evolved@preview/images/logo-small.png
// @icon64       https://cdn.jsdelivr.net/gh/the1812/Bilibili-Evolved@preview/images/logo.png
// ==/UserScript==
/* eslint-disable */ /* spell-checker: disable */
// @[ You can find all source codes in GitHub repo ]

Vue.config.productionTip = false
Vue.config.devtools = false
// if (unsafeWindow.Vue === undefined) {
//   unsafeWindow.Vue = Vue
// }

// GM4 polyfill start
if (typeof GM == 'undefined') {
  this.GM = {}
}
Object.entries({
  'log': console.log.bind(console),
  'info': GM_info,
}).forEach(([newKey, old]) => {
  if (old && (typeof GM[newKey] == 'undefined')) {
    GM[newKey] = old
  }
})
Object.entries({
  'GM_getValue': 'getValue',
  'GM_setClipboard': 'setClipboard',
  'GM_setValue': 'setValue',
  'GM_xmlhttpRequest': 'xmlHttpRequest',
}).forEach(([oldKey, newKey]) => {
  let old = this[oldKey]
  if (old && (typeof GM[newKey] == 'undefined')) {
    GM[newKey] = function (...args) {
      return new Promise((resolve, reject) => {
        try {
          resolve(old.apply(this, args))
        } catch (e) {
          reject(e)
        }
      })
    }
  }
})
// GM4 polyfill end

// Safari EventTarget polyfill
window.EventTarget = class EventTarget {
  constructor() {
    this.listeners = {}
  }
  addEventListener(type, callback) {
    if (!(type in this.listeners)) {
      this.listeners[type] = []
    }
    this.listeners[type].push(callback)
  }
  removeEventListener(type, callback) {
    if (!(type in this.listeners)) {
      return
    }
    let stack = this.listeners[type]
    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1)
        return
      }
    }
  }
  dispatchEvent(event) {
    if (!(event.type in this.listeners)) {
      return true
    }
    let stack = this.listeners[event.type].slice()
    for (let i = 0, l = stack.length; i < l; i++) {
      stack[i].call(this, event)
    }
    return !event.defaultPrevented
  }
}
// Safari EventTarget polyfill end

import { logError, raiseEvent, loadLazyPanel, contentLoaded, fixed, isOffline, getUID, scriptVersion, getCsrf, formatCount, escapeFilename } from './utils'
import { settings, loadSettings, settingsChangeHandlers } from './settings'
import { Ajax, setupAjaxHook } from './ajax'
import { loadResources } from './resource-loader'
import { Toast } from './toast-holder'
import { DoubleClickEvent } from './double-click-event'
import { Observer } from './observer'
import { SpinQuery } from './spin-query'
import { ColorProcessor } from './color-processor'
// [Offline build placeholder]
import { ResourceType } from './resource-type'
import { Resource } from './resource'
import { resourceManifest } from './resource-manifest'
import { StyleManager } from './style-manager'
import { ResourceManager } from './resource-manager'
import { getScriptBlocker } from './script-blocker'
import { installStyle, uninstallStyle, toggleStyle } from './custom-styles'
import { store } from './store'

;(async () => {
  const redundantFrames = [
    'https://message.bilibili.com/pages/nav/index_new_sync',
    'https://message.bilibili.com/pages/nav/index_new_pc_sync',
    'https://t.bilibili.com/h5/dynamic/specification',
  ]
  // const anonymousRedundantFrame = (
  //   unsafeWindow.parent.window !== unsafeWindow &&
  //   unsafeWindow.parent.window.document.getElementById('mce_0_ifr')
  // )
  if (await GM.getValue('customNavbar') === true
    && (redundantFrames.includes(document.URL))) {
    if (await GM.getValue('useDarkStyle') === true) {
      document.documentElement.style.setProperty('--theme-color', await GM.getValue('customStyleColor'))
      if (typeof offlineData === 'undefined') {
        const cache = await GM.getValue('cache', {})
        if ('darkStyle' in cache) {
          const style = document.createElement('style')
          style.innerHTML = cache.darkStyle
          style.id = 'dark-style'
          document.documentElement.insertAdjacentElement('afterbegin', style)
        }
      } else {
        const style = document.createElement('style')
        style.innerHTML = Object.entries(offlineData).find(([key]) => {
          return key.includes('/dark.min.css')
        })[1]
        style.id = 'dark-style'
        document.documentElement.insertAdjacentElement('afterbegin', style)
      }
    }
    console.log(`Skipped <iframe> loading for ${document.URL}`)
    return
  }
  try {
    const events = {}
    for (const name of ['init', 'styleLoaded', 'scriptLoaded']) {
      events[name] = {
        completed: false,
        subscribers: [],
        complete () {
          this.completed = true
          this.subscribers.forEach(it => it())
        }
      }
    }
    if (unsafeWindow.bilibiliEvolved === undefined) {
      unsafeWindow.bilibiliEvolved = { addons: [] }
    }
    Object.assign(unsafeWindow.bilibiliEvolved, {
      subscribe (type, callback) {
        const event = events[type]
        if (callback) {
          if (event && !event.completed) {
            event.subscribers.push(callback)
          } else {
            callback()
          }
        } else {
          return new Promise((resolve) => this.subscribe(type, () => resolve()))
        }
      }
    })
    contentLoaded(() => {
      document.body.classList.add('round-corner')
    })
    await loadResources()
    await loadSettings()
    getScriptBlocker().then(scriptBlocker => {
      scriptBlocker.start()
    })
    if (settings.ajaxHook) {
      setupAjaxHook()
    }
    const resources = new ResourceManager()
    events.init.complete()
    resources.styleManager.prefetchStyles()
    // if (settings.customNavbar) {
    //   contentLoaded(() => {
    //     document.body.classList.add('custom-navbar-loading')
    //     if (settings.useDarkStyle) {
    //       document.body.classList.add('dark')
    //     }
    //   })
    // }
    events.styleLoaded.complete()

    const prefetchLink = document.createElement('link')
    prefetchLink.rel = 'dns-prefetch'
    prefetchLink.href = 'https://api.bilibili.com'
    document.documentElement.insertAdjacentElement('afterbegin', prefetchLink)

    Object.assign(unsafeWindow.bilibiliEvolved, {
      SpinQuery,
      Toast,
      Observer,
      DoubleClickEvent,
      ColorProcessor,
      StyleManager,
      ResourceManager,
      Resource,
      ResourceType,
      Ajax,
      resourceManifest,
      loadSettings,
      logError,
      raiseEvent,
      loadLazyPanel,
      contentLoaded,
      fixed,
      settings,
      settingsChangeHandlers,
      addSettingsListener,
      removeSettingsListener,
      isEmbeddedPlayer,
      isIframe,
      getI18nKey,
      dq,
      dqa,
      UserAgent,
      EmptyImageUrl,
      ascendingSort,
      descendingSort,
      formatFileSize,
      formatDuration,
      getDpiSourceSet,
      getScriptBlocker,
      isOffline,
      getUID,
      scriptVersion,
      getCsrf,
      formatCount,
      escapeFilename,
      installStyle,
      uninstallStyle,
      toggleStyle,
      store,
      resources,
      theWorld: waitTime => {
        if (waitTime > 0) {
          setTimeout(() => { debugger }, waitTime)
        } else {
          debugger
        }
      },
      monkeyInfo: GM.info,
      monkeyApis: {
        getValue: GM.getValue,
        setValue: GM.setValue,
        setClipboard: GM.setClipboard,
        xhr: GM.xmlHttpRequest,
        addValueChangeListener: () => console.warn('此功能已弃用.')
      }
    })
    const applyScripts = () => resources.fetch()
      .then(() => {
        events.scriptLoaded.complete()
        const addons = new Proxy(unsafeWindow.bilibiliEvolved.addons || [], {
          apply: function (target, thisArg, argumentsList) {
            return thisArg[target].apply(this, argumentsList)
          },
          set: function (target, property, value) {
            if (target[property] === undefined) {
              resources.applyWidget(value)
            }
            target[property] = value
            return true
          }
        })
        addons.forEach(it => resources.applyWidget(it))
        Object.assign(unsafeWindow.bilibiliEvolved, { addons })
      })
      .catch(error => logError(error))
    const loadingMode = settings.scriptLoadingMode
    switch (loadingMode) {
      case '延后':
        fullyLoaded(applyScripts)
        break
      case '同时':
        contentLoaded(applyScripts)
        break
      case '自动':
      case '延后(自动)':
        {
          const quickLoads = [
            '//live.bilibili.com',
            '//www.bilibili.com/s/video',
          ]
          if (quickLoads.some(it => document.URL.includes(it))) {
            contentLoaded(applyScripts)
          } else {
            fullyLoaded(applyScripts)
          }
          break
        }
      case '同时(自动)':
        {
          const delayLoads = [
            '//www.bilibili.com/video/',
            '//www.bilibili.com/bangumi/play',
          ]
          if (delayLoads.some(it => document.URL.includes(it))) {
            fullyLoaded(applyScripts)
          } else {
            contentLoaded(applyScripts)
          }
          break
        }
      default:
        break
    }
  } catch (error) {
    logError(error)
  }
})()