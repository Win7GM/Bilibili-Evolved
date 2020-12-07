export class Resource {
  get downloaded () {
    return this.text !== null
  }
  constructor (url, { styles = [], alwaysPreview = false } = {}) {
    this.relativePath = 'min/' + url
    this.rawUrl = Resource.root + 'min/' + url
    this.dependencies = []
    this.styles = styles
    this.text = null
    this.key = null
    this.alwaysPreview = alwaysPreview
    this.type = ResourceType.fromUrl(url)
    this.displayName = ''
  }
  get url () {
    if (typeof offlineData === 'undefined' && this.alwaysPreview) {
      return this.rawUrl.replace('/master/', '/preview/')
    }
    return this.rawUrl
  }
  flatMapPolyfill () {
    if (Array.prototype.flatMap === undefined) {
      const flatMap = function (mapFunc) {
        return this
          .map(mapFunc)
          .reduce((acc, it) => acc.concat(it), [])
      }
      return flatMap
    } else {
      return Array.prototype.flatMap
    }
  }
  loadCache () {
    const key = this.key
    if (!settings.cache || !settings.cache[key]) {
      return null
    } else {
      return settings.cache[key]
    }
  }
  async download () {
    const key = this.key
    return new Promise((resolve, reject) => {
      if (this.downloaded) {
        resolve(this.text)
      } else {
        const flattenStyles = this.flatMapPolyfill()
          .bind(this.styles)(it => typeof it === 'object' ? it.key : it)
        Promise.all(this.dependencies
          .concat(flattenStyles.map(it => Resource.all[it]))
          .map(r => r.download())
        )
          .then(() => {
            // +#Offline build placeholder
            if (settings.useCache) {
              const cache = this.loadCache(key)
              if (cache !== null) {
                this.text = cache
                // console.log(`hit cache: ${key}`)
                resolve(cache)
              } else if (settings.scriptDownloadMode === 'bundle') {
                const text = onlineData[this.url] || onlineData[this.rawUrl]
                // settings.cache = Object.assign(settings.cache, {
                //   [key]: this.text
                // })
                if (this.alwaysPreview) {
                  // console.log('Load preview data', key)
                  Ajax.monkey({ url: `${Resource.cdnRoot || Resource.root}${this.relativePath}` })
                    .then(text => {
                      // console.log(`load preview data: ${key}`)
                      this.text = text
                      settings.cache = Object.assign(settings.cache, {
                        [key]: text
                      })
                      // console.log('Preview data loaded', key)
                      // resolve(this.text)
                    })
                    .catch(error => reject(error))
                }
                if (text) {
                  // console.log(`load online data: ${key}`)
                  // if (this.alwaysPreview) {
                  //   console.log('Get fallback text', key)
                  // }
                  this.text = text
                  resolve(this.text)
                }
              }
              if (settings.scriptDownloadMode !== 'bundle') {
                Ajax.monkey({ url: this.url })
                  .then(text => {
                    this.text = text
                    if (cache !== this.text) {
                      if (cache === null) {
                        resolve(this.text)
                      }
                      // console.log(`individual cache: ${key}`)
                      settings.cache = Object.assign(settings.cache, {
                        [key]: this.text
                      })
                    }
                    resolve(this.text)
                  })
                  .catch(error => reject(error))
              }
            } else {
              Ajax.monkey({ url: this.url })
                .then(text => {
                  this.text = this.type.preprocessor(text)
                  resolve(this.text)
                })
                .catch(error => reject(error))
            }
            // -#Offline build placeholder
          })
      }
    })
  }
  getStyle (id) {
    const style = this.text
    if (style === null) {
      console.error(`Attempt to get style which is not downloaded. key = ${this.key}`)
    }
    const styleElement = document.createElement('style')
    styleElement.id = id
    styleElement.innerText = style
    return styleElement
  }
  getPriorStyle () {
    if (this.priority !== undefined) {
      let insertPosition = this.priority - 1
      let formerStyle = $(`style[priority='${insertPosition}']`)
      while (insertPosition >= 0 && formerStyle.length === 0) {
        formerStyle = $(`style[priority='${insertPosition}']`)
        insertPosition--
      }
      if (insertPosition < 0) {
        return null
      } else {
        return formerStyle
      }
    } else {
      return null
    }
  }
  applyStyle (id, important) {
    if (!document.querySelector(`#${id}`)) {
      const style = this.getStyle(id)
      if (important) {
        document.body.insertAdjacentElement('beforeend', style)
      } else {
        document.documentElement.insertAdjacentElement('afterbegin', style)
      }
    }
  }
}
