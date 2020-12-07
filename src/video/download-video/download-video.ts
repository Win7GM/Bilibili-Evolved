import { getFriendlyTitle } from '../title'
import { VideoInfo, DanmakuInfo, JsonDanmaku } from '../video-info'
import { VideoDownloaderFragment } from './video-downloader-fragment'
import { DownloadPackage } from '../../utils/download-package'
import { BatchTitleParameter, BatchExtractor } from './batch-download'

/**
 * ☢警告☢ ☢CAUTION☢
 * 可读性/可维护性极差, 祖传代码/重复逻辑
 * 谨 慎 阅 读
 */

interface PageData {
  entity: Video
  aid: string
  cid: string
}
class Video {
  async getApiGenerator(dash = false) {
    function api(aid: number | string, cid: number | string, quality?: number) {
      if (dash) {
        if (quality) {
          return `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json&fourk=1&fnver=0&fnval=80`
        } else {
          return `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&otype=json&fourk=1&fnver=0&fnval=80`
        }
      } else {
        if (quality) {
          return `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json`
        } else {
          return `https://api.bilibili.com/x/player/playurl?avid=${aid}&cid=${cid}&otype=json`
        }
      }
    }
    return api.bind(this) as typeof api
  }
  async getDashUrl(quality?: number) {
    return (await this.getApiGenerator(true))(pageData.aid, pageData.cid, quality)
  }
  async getUrl(quality?: number) {
    return (await this.getApiGenerator())(pageData.aid, pageData.cid, quality)
  }
}
class Bangumi extends Video {
  async getApiGenerator(dash = false) {
    function api(aid: number | string, cid: number | string, quality?: number) {
      if (dash) {
        if (quality) {
          return `https://api.bilibili.com/pgc/player/web/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json&fourk=1&fnval=16`
        } else {
          return `https://api.bilibili.com/pgc/player/web/playurl?avid=${aid}&cid=${cid}&otype=json&fourk=1&fnval=16`
        }
      } else {
        if (quality) {
          return `https://api.bilibili.com/pgc/player/web/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json`
        } else {
          return `https://api.bilibili.com/pgc/player/web/playurl?avid=${aid}&cid=${cid}&qn=&otype=json`
        }
      }
    }
    return api.bind(this) as typeof api
  }
}
// 课程, 不知道为什么b站给它起名cheese, 芝士就是力量?
class Cheese extends Video {
  constructor(public ep: number | string) { super() }
  async getApiGenerator(dash = false) {
    function api(aid: number | string, cid: number | string, quality?: number) {
      if (dash) {
        if (quality) {
          return `https://api.bilibili.com/pugv/player/web/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json&ep_id=${this.ep}&fnver=0&fnval=16`
        } else {
          return `https://api.bilibili.com/pugv/player/web/playurl?avid=${aid}&cid=${cid}&otype=json&ep_id=${this.ep}&fnver=0&fnval=16`
        }
      } else {
        if (quality) {
          return `https://api.bilibili.com/pugv/player/web/playurl?avid=${aid}&cid=${cid}&qn=${quality}&otype=json&ep_id=${this.ep}`
        } else {
          return `https://api.bilibili.com/pugv/player/web/playurl?avid=${aid}&cid=${cid}&otype=json&ep_id=${this.ep}`
        }
      }
    }
    return api.bind(this) as typeof api
  }
}

const pageData: PageData = {
  entity: new Video(),
  aid: '',
  cid: ''
}
let formats: VideoFormat[] = []
let selectedFormat: VideoFormat | null = null
// let userInfo: {
//   isLogin: boolean
//   vipStatus: number
// } | null = null

class VideoFormat {
  quality: number
  internalName: string
  displayName: string
  constructor(quality: number, internalName: string, displayName: string) {
    this.quality = quality
    this.internalName = internalName
    this.displayName = displayName
  }
  async downloadInfo(dash = false) {
    const videoInfo = new VideoDownloader(this)
    await videoInfo.fetchVideoInfo(dash)
    return videoInfo
  }
  static parseFormats(data: any): VideoFormat[] {
    const qualities = data.accept_quality
    const internalNames = data.accept_format.split(',')
    const displayNames = data.accept_description
    const formats = qualities.map((q: number, index: number) => {
      return new VideoFormat(
        q,
        internalNames[index],
        displayNames[index]
      )
    })
    // while (qualities.length > 0) {
    //   const format = new VideoFormat(
    //     qualities.pop(),
    //     internalNames.pop(),
    //     displayNames.pop()
    //   )
    //   formats.push(format)
    // }
    return formats
  }
  static async filterFormats(formats: VideoFormat[]) {
    return formats
    // if (userInfo === null) {
    //   userInfo = (await Ajax.getJsonWithCredentials('https://api.bilibili.com/x/web-interface/nav')).data
    // }
    // _.remove(formats, f => {
    //   const q = f.quality
    //   if (userInfo!.isLogin === false) {
    //     return q >= 64
    //   }
    //   if (userInfo!.vipStatus !== 1) {
    //     return q === 116 || q === 112 || q === 74
    //   }
    //   return false
    // })
    // return formats
  }
  static async getAvailableDashFormats(): Promise<VideoFormat[]> {
    const url = await pageData.entity.getDashUrl()
    const json = await Ajax.getJsonWithCredentials(url)
    if (json.code !== 0) {
      throw new Error('获取清晰度信息失败.')
    }
    const data = json.data || json.result || json
    return await VideoFormat.filterFormats(VideoFormat.parseFormats(data))
  }
  static async getAvailableFormats(): Promise<VideoFormat[]> {
    const { BannedResponse, throwBannedError } = await import('./batch-warning')
    try {
      const url = await pageData.entity.getUrl()
      const json = await Ajax.getJsonWithCredentials(url)
      if (json.code !== 0) {
        throw new Error('获取清晰度信息失败.')
      }
      const data = json.data || json.result || json
      return await VideoFormat.filterFormats(VideoFormat.parseFormats(data))
    } catch (error) {
      if ((error as Error).message.includes(BannedResponse.toString())) {
        throwBannedError()
      }
      throw error
    }
  }
}
const allFormats: VideoFormat[] = [
  new VideoFormat(125, 'HDR', '真彩 HDR'),
  new VideoFormat(120, '4K', '超清 4K'),
  new VideoFormat(116, '1080P60', '高清 1080P60'),
  new VideoFormat(112, '1080P+', '高清 1080P+'),
  new VideoFormat(80, '1080P', '高清 1080P'),
  new VideoFormat(74, '720P60', '高清 720P60'),
  new VideoFormat(64, '720P', '高清 720P'),
  new VideoFormat(32, '480P', '清晰 480P'),
  new VideoFormat(16, '360P', '流畅 360P'),
]
const getDanmaku = async (value: DanmakuOption, aid: string | number, cid: string | number) => {
  if (value === '无') {
    return null
  }
  if (value === 'XML') {
    const danmakuInfo = await new DanmakuInfo(cid).fetchInfo()
    return danmakuInfo.rawXML
  }
  const danmaku = await new JsonDanmaku(aid, cid).fetchInfo()
  if (value === 'JSON') {
    return JSON.stringify(danmaku.jsonDanmakus)
  }
  if (value === 'ASS') {
    const { convertToAssFromJson } = await import('../download-danmaku')
    return convertToAssFromJson(danmaku)
  }

  return null
}
class VideoDownloader {
  format: VideoFormat
  subtitle = false
  fragments: VideoDownloaderFragment[]
  fragmentSplitFactor = 6 * 2
  workingXhr: XMLHttpRequest[] | null = null
  progress: (progress: number) => void
  progressMap: Map<XMLHttpRequest, number> = new Map()
  videoSpeed: VideoSpeed

  constructor(format: VideoFormat, fragments?: VideoDownloaderFragment[]) {
    this.format = format
    this.fragments = fragments || []
    this.videoSpeed = new VideoSpeed(this)
  }
  get danmakuOption() {
    return settings.downloadVideoDefaultDanmaku
  }
  get subtitleOption() {
    return settings.downloadVideoDefaultSubtitle
  }
  get isDash() {
    return this.fragments.some(it => it.url.includes('.m4s'))
  }
  get totalSize() {
    return this.fragments.map(it => it.size).reduce((acc, it) => acc + it)
  }
  async fetchVideoInfo(dash = false): Promise<VideoDownloaderFragment[]> {
    if (!dash) {
      const url = await pageData.entity.getUrl(this.format.quality)
      const text = await Ajax.getTextWithCredentials(url)
      const json = JSON.parse(text.replace(/http:/g, 'https:'))
      const data = json.data || json.result || json
      const q = this.format.quality
      if (data.quality !== q) {
        const { throwQualityError } = await import('./quality-errors')
        throwQualityError(q)
      }
      const urls = data.durl
      this.fragments = urls.map((it: any) => {
        return {
          length: it.length,
          size: it.size,
          url: it.url,
          backupUrls: it.backup_url
        } as VideoDownloaderFragment
      })
    }
    else {
      const { dashToFragments, getDashInfo } = await import('./video-dash')
      const dashes = await getDashInfo(
        await pageData.entity.getDashUrl(this.format.quality),
        this.format.quality
      )
      this.fragments = dashToFragments(dashes)
    }
    return this.fragments
  }
  updateProgress() {
    const progress = this.progressMap
      ? [...this.progressMap.values()].reduce((a, b) => a + b, 0) / this.totalSize : 0
    if (progress > 1 || progress < 0) {
      console.error(`[下载视频] 进度异常: ${progress}`, this.progressMap.values())
    }
    this.progress && this.progress(progress)
  }
  cancelDownload() {
    this.videoSpeed.stopMeasure()
    if (this.workingXhr !== null) {
      this.workingXhr.forEach(it => it.abort())
    } else {
      logError('Cancel Download Failed: forEach in this.workingXhr not found.')
    }
  }
  downloadFragment(fragment: VideoDownloaderFragment) {
    const promises: Promise<ArrayBuffer>[] = []
    /**
     * 按一定大小分段或许对大视频更好
     *
     * DASH:
     *   - 小于等于24MB时, 均分为12段 (`this.fragmentSplitFactor = 12`)
     *   - 大于24MB时, 每4MB为一段
     *
     * FLV:
     *   - 小于等于96MB时, 均分为12段
     *   - 大于96MB时, 每16MB为一段
     */
    const minimalLength = this.isDash ? 4 * 1024 * 1024 : 16 * 1024 * 1024
    let partialLength: number
    if (fragment.size <= minimalLength * 6) {
      partialLength = fragment.size / this.fragmentSplitFactor
    } else {
      partialLength = minimalLength
    }
    let startByte = 0
    const getPartNumber = (xhr: XMLHttpRequest) => [...this.progressMap.keys()].indexOf(xhr) + 1
    while (startByte < fragment.size) {
      const endByte = Math.min(fragment.size - 1, Math.round(startByte + partialLength))
      const range = `bytes=${startByte}-${endByte}`
      const rangeLength = endByte - startByte + 1
      promises.push(new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', fragment.url)
        xhr.responseType = 'arraybuffer'
        xhr.withCredentials = false
        xhr.addEventListener('progress', (e) => {
          console.log(`[下载视频] 视频片段${getPartNumber(xhr)}下载进度: ${e.loaded}/${rangeLength} bytes loaded, ${range}`)
          this.progressMap.set(xhr, e.loaded)
          this.updateProgress()
        })
        xhr.addEventListener('load', () => {
          if (('' + xhr.status)[0] === '2') {
            console.log(`[下载视频] 视频片段${getPartNumber(xhr)}下载完成`)
            resolve(xhr.response)
          } else {
            reject(`视频片段${getPartNumber(xhr)}请求失败, response = ${xhr.status}`)
          }
        })
        xhr.addEventListener('abort', () => reject('canceled'))
        xhr.addEventListener('error', () => {
          console.error(`[下载视频] 视频片段${getPartNumber(xhr)}下载失败: ${range}`)
          this.progressMap.set(xhr, 0)
          this.updateProgress()
          xhr.open('GET', fragment.url)
          xhr.setRequestHeader('Range', range)
          xhr.send()
        })
        xhr.setRequestHeader('Range', range)
        this.progressMap.set(xhr, 0)
        xhr.send()
        this.workingXhr!.push(xhr)
      }))
      startByte = Math.round(startByte + partialLength) + 1
    }
    return Promise.all(promises)
  }
  async copyUrl() {
    const urls = this.fragments.map(it => it.url).reduce((acc, it) => acc + '\r\n' + it)
    GM.setClipboard(urls, 'text')
  }
  async showUrl() {
    const message = this.fragments.map(it => /*html*/`
      <a class="download-link" href="${it.url}">${it.url}</a>
    `).reduce((acc, it) => acc + '\r\n' + it)
    Toast.success(message + /*html*/`<a class="link" id="copy-link" style="cursor: pointer;margin: 8px 0 0 0;">复制全部</a>`, '显示链接')
    const copyLinkButton = await SpinQuery.select('#copy-link') as HTMLElement
    copyLinkButton.addEventListener('click', async () => {
      await this.copyUrl()
    })
  }
  async exportIdm() {
    const { toIdmFormat } = await import('./idm-support')
    const idm = toIdmFormat([this])
    const danmaku = await this.downloadDanmaku()
    const subtitle = await this.downloadSubtitle()
    const pack = new DownloadPackage()
    pack.add(
      `${getFriendlyTitle()}.${this.danmakuOption === 'ASS' ? 'ass' : 'xml'}`,
      danmaku
    )
    pack.add(
      `${getFriendlyTitle()}.${this.subtitleOption === 'ASS' ? 'ass' : 'json'}`,
      subtitle
    )
    pack.add(
      `${getFriendlyTitle()}.ef2`,
      idm
    )
    await pack.emit(`${getFriendlyTitle()}.zip`)
  }
  async exportData(copy = false) {
    const data = JSON.stringify([{
      fragments: this.fragments,
      title: getFriendlyTitle(),
      totalSize: this.fragments.map(it => it.size).reduce((acc, it) => acc + it),
      referer: document.URL.replace(window.location.search, '')
    }])
    if (copy) {
      GM.setClipboard(data, 'text')
    } else {
      const blob = new Blob([data], { type: 'text/json' })
      const danmaku = await this.downloadDanmaku()
      const pack = new DownloadPackage()
      pack.add(`${getFriendlyTitle()}.json`, blob)
      pack.add(getFriendlyTitle() + '.' + this.danmakuOption.toLowerCase(), danmaku)
      await pack.emit(`${getFriendlyTitle()}.zip`)
    }
  }
  async exportAria2(rpc = false) {
    const { getNumber } = await import('./get-number')
    if (rpc) { // https://aria2.github.io/manual/en/html/aria2c.html#json-rpc-using-http-get
      const danmaku = await this.downloadDanmaku()
      const subtitle = await this.downloadSubtitle()
      const pack = new DownloadPackage()
      pack.add(
        `${getFriendlyTitle()}.${this.danmakuOption === 'ASS' ? 'ass' : 'xml'}`,
        danmaku
      )
      pack.add(
        `${getFriendlyTitle()}.${this.subtitleOption === 'ASS' ? 'ass' : 'json'}`,
        subtitle
      )
      await pack.emit()
      const option = settings.aria2RpcOption
      const params = this.fragments.map((fragment, index) => {
        let indexNumber = ''
        if (this.fragments.length > 1 && !this.isDash) {
          indexNumber = ' - ' + getNumber(index + 1, this.fragments.length)
        }
        const params = []
        if (option.secretKey !== '') {
          params.push(`token:${option.secretKey}`)
        }
        params.push([fragment.url])
        params.push({
          referer: document.URL.replace(window.location.search, ''),
          'user-agent': UserAgent,
          out: `${getFriendlyTitle()}${indexNumber}${this.extension(fragment)}`,
          split: this.fragmentSplitFactor,
          dir: (option.baseDir + option.dir) || undefined,
          'max-download-limit': option.maxDownloadLimit || undefined,
        })
        const id = encodeURIComponent(`${getFriendlyTitle()}${indexNumber}`)
        return {
          params,
          id,
        }
      })
      const { sendRpc } = await import('./aria2-rpc')
      await sendRpc(params)
    } else { // https://aria2.github.io/manual/en/html/aria2c.html#input-file
      const input = `
# Generated by Bilibili Evolved Video Export
# https://github.com/the1812/Bilibili-Evolved/
${this.fragments.map((it, index) => {
        let indexNumber = ''
        if (this.fragments.length > 1 && !this.isDash) {
          indexNumber = ' - ' + getNumber(index + 1, this.fragments.length)
        }
        return `
${it.url}
  referer=${document.URL.replace(window.location.search, '')}
  user-agent=${UserAgent}
  out=${getFriendlyTitle()}${indexNumber}${this.extension(it)}
  split=${this.fragmentSplitFactor}
  `.trim()
      }).join('\n')}
      `.trim()
      const blob = new Blob([input], { type: 'text/plain' })
      const danmaku = await this.downloadDanmaku()
      const subtitle = await this.downloadSubtitle()
      const pack = new DownloadPackage()
      pack.add(`${getFriendlyTitle()}.txt`, blob)
      pack.add(getFriendlyTitle() + '.' + this.danmakuOption.toLowerCase(), danmaku)
      pack.add(getFriendlyTitle() + '.' + this.subtitleOption.toLowerCase(), subtitle)
      await pack.emit(`${getFriendlyTitle()}.zip`)
    }
  }
  extension(fragment?: VideoDownloaderFragment) {
    const f = (fragment || this.fragments[0])
    const match = [
      '.flv',
      '.mp4',
    ].find(it => f.url.includes(it))
    if (match) {
      return match
    } else if (f.url.includes('.m4s')) {
      return this.fragments.indexOf(f) === 0 ? '.mp4' : '.m4a'
    } else {
      console.warn('No extension detected.')
      return '.flv'
    }
  }
  async downloadDanmaku() {
    if (this.danmakuOption !== '无') {
      const danmakuInfo = new DanmakuInfo(pageData.cid)
      await danmakuInfo.fetchInfo()
      if (this.danmakuOption === 'XML') {
        return danmakuInfo.rawXML
      } else {
        const { convertToAss } = await import('../download-danmaku')
        return convertToAss(danmakuInfo.rawXML)
      }
    } else {
      return null
    }
  }
  async downloadSubtitle() {
    if (this.subtitle && this.subtitleOption !== '无') {
      const { getSubtitleConfig, getSubtitleList } = await import('../download-subtitle/download-subtitle')
      const [config, language] = await getSubtitleConfig()
      const subtitles = await getSubtitleList(pageData.aid, pageData.cid)
      const subtitle = subtitles.find(s => s.language === language) || subtitles[0]
      const json = await Ajax.getJson(subtitle.url)
      const rawData = json.body
      if (this.subtitleOption === 'JSON') {
        return rawData
      } else {
        const { SubtitleConverter } = await import('../download-subtitle/subtitle-converter')
        const converter = new SubtitleConverter(config)
        const ass = await converter.convertToAss(rawData)
        return ass
      }
    }
    return null
  }
  async download() {
    this.workingXhr = []
    this.progressMap = new Map()
    this.updateProgress()
    const downloadedData: ArrayBuffer[][] = []
    this.videoSpeed.startMeasure()
    for (const fragment of this.fragments) {
      const data = await this.downloadFragment(fragment)
      downloadedData.push(data)
    }
    if (downloadedData.length < 1) {
      throw new Error('下载失败.')
    }

    const title = getFriendlyTitle()
    const pack = new DownloadPackage()
    const { getNumber } = await import('./get-number')
    downloadedData.forEach((data, index) => {
      let filename: string
      const fragment = this.fragments[index]
      if (downloadedData.length > 1 && !this.isDash) {
        filename = `${title} - ${getNumber(index + 1, downloadedData.length)}${this.extension(fragment)}`
      } else {
        filename = `${title}${this.extension(fragment)}`
      }
      pack.add(filename, new Blob(Array.isArray(data) ? data : [data]))
    })
    const danmaku = await this.downloadDanmaku()
    pack.add(
      `${getFriendlyTitle()}.${this.danmakuOption === 'ASS' ? 'ass' : 'xml'}`,
      danmaku
    )
    const subtitle = await this.downloadSubtitle()
    pack.add(
      `${getFriendlyTitle()}.${this.subtitleOption === 'ASS' ? 'ass' : 'json'}`,
      subtitle
    )
    await pack.emit(title + '.zip')
    this.progress && this.progress(0)
    this.videoSpeed.stopMeasure()
  }
}
class VideoSpeed {
  workingDownloader: VideoDownloader
  lastProgress = 0
  measureInterval = 1000
  intervalTimer: number
  speedUpdate: (speed: string) => void
  constructor(downloader: VideoDownloader) {
    this.workingDownloader = downloader
  }
  startMeasure() {
    this.intervalTimer = window.setInterval(() => {
      const progress = this.workingDownloader.progressMap
        ? [...this.workingDownloader.progressMap.values()].reduce((a, b) => a + b, 0) : 0
      const loadedBytes = progress - this.lastProgress
      if (this.speedUpdate !== undefined) {
        this.speedUpdate(formatFileSize(loadedBytes) + '/s')
      }
      this.lastProgress = progress
    }, this.measureInterval)
  }
  stopMeasure() {
    clearInterval(this.intervalTimer)
  }
}
async function loadPageData() {
  const aid = await SpinQuery.select(() => (unsafeWindow || window).aid)
  const cid = await SpinQuery.select(() => (unsafeWindow || window).cid)
  if (!(aid && cid)) {
    return false
  }
  pageData.aid = aid
  pageData.cid = cid
  if (document.URL.includes('bangumi')) {
    pageData.entity = new Bangumi()
  } else if (document.URL.includes('cheese')) {
    const match = document.URL.match(/cheese\/play\/ep([\d]+)/)!
    pageData.entity = new Cheese(match[1])
  } else {
    pageData.entity = new Video()
  }
  try {
    formats = await VideoFormat.getAvailableFormats()
  } catch (error) {
    return false
  }
  return true
}
const getDefaultFormat = (formats: VideoFormat[]) => {
  const defaultQuality = settings.downloadVideoQuality
  const format = formats.find(f => f.quality === defaultQuality)
  if (format) {
    return format
  }
  const nextFormat = formats.filter(f => f.quality < defaultQuality).shift()
  if (nextFormat) {
    return nextFormat
  }
  return formats.shift()!!
}
async function loadWidget() {
  selectedFormat = getDefaultFormat(formats)
  resources.applyStyle('downloadVideoStyle')
  const button = dq('#download-video') as HTMLElement
  button.addEventListener('click', () => {
    const panel = dq('.download-video') as HTMLElement
    panel.classList.toggle('opened')
    window.scroll(0, 0);
    (dq('.gui-settings-mask') as HTMLDivElement).click()
  })
  // document.body.insertAdjacentHTML('beforeend', resources.import('downloadVideoHtml'))
  // loadPanel()
  button.addEventListener('mouseover', () => {
    // document.body.insertAdjacentHTML('beforeend', resources.import('downloadVideoHtml'))
    loadPanel()
  }, { once: true })
}
async function loadPanel() {
  // const start = performance.now()
  let workingDownloader: VideoDownloader
  // const sizeCache = new Map<VideoFormat, number>()
  type ExportType = 'copyLink' | 'showLink' | 'aria2' | 'aria2RPC' | 'copyVLD' | 'exportVLD' | 'ffmpegEpisodes' | 'ffmpegFragments' | 'idm'
  interface EpisodeItem {
    title: string
    titleParameters?: BatchTitleParameter
    checked: boolean
    index: number
    cid: string
    aid: string
  }
  const panelTabs = [
    {
      name: 'single',
      displayName: '单个视频',
    },
    {
      name: 'batch',
      displayName: '批量导出',
    },
    {
      name: 'manual',
      displayName: '手动输入',
    },
  ]
  const panel = new Vue({
    // el: '.download-video',
    template: resources.import('downloadVideoHtml'),
    components: {
      VDropdown: () => import('./v-dropdown.vue'),
      VCheckbox: () => import('./v-checkbox.vue'),
      RpcProfiles: () => import('./aria2-rpc-profiles.vue'),
    },
    data: {
      /** 当前页面是否支持批量导出 */
      batch: false,
      /** 当前页面是否含有CC字幕 */
      subtitle: false,
      selectedTab: panelTabs[0],
      coverUrl: EmptyImageUrl,
      aid: pageData.aid,
      cid: pageData.cid,
      dashModel: {
        value: settings.downloadVideoFormat,
        items: ['flv', 'dash'],
      },
      qualityModel: {
        value: selectedFormat!.displayName,
        items: formats.map(f => f.displayName)
      },
      manualQualityModel: {
        value: allFormats[1].displayName,
        items: allFormats.map(f => f.displayName),
      },
      danmakuModel: {
        value: settings.downloadVideoDefaultDanmaku as DanmakuOption,
        items: ['无', 'XML', 'JSON', 'ASS'] as DanmakuOption[]
      },
      subtitleModel: {
        value: settings.downloadVideoDefaultSubtitle as SubtitleOption,
        items: ['无', 'JSON', 'ASS'] as SubtitleOption[]
      },
      codecModel: {
        value: settings.downloadVideoDashCodec,
        items: ['AVC/H.264', 'HEVC/H.265']
      },
      // ffmpegModel: {
      //   value: settings.downloadVideoFfmpegSupport,
      //   items: ['无', '文件列表']
      //   // items: ['无', '文件列表', '文件列表+脚本']
      // },
      progressPercent: 0,
      size: '获取大小中' as number | string,
      blobUrl: '',
      lastCheckedEpisodeIndex: -1,
      episodeList: [] as EpisodeItem[],
      downloading: false,
      speed: '',
      rpcSettings: settings.aria2RpcOption,
      showRpcSettings: false,
      busy: false,
      saveRpcSettingsText: '保存配置',
      enableDash: settings.enableDashDownload,
      lastDirectDownloadLink: '',
      manualInputText: '',
    },
    computed: {
      tabs() {
        if (this.batch) {
          return panelTabs
        }
        const clone = [...panelTabs]
        _.remove(clone, it => it.name === 'batch')
        return clone
      },
      manualInputItems() {
        const itemTexts: string[] = (this.manualInputText as string).split(/\s/g)
        const items = itemTexts.map(it => it.match(/av(\d+)/i) || it.match(/^(\d+)$/))
        return _.uniq(items.filter(it => it !== null).map(it => it![1]))
      },
      downloadSingle() {
        return this.selectedTab.name === 'single'
      },
      displaySize() {
        if (typeof this.size === 'string') {
          return this.size
        }
        return formatFileSize(this.size)
      },
      sizeWarning() {
        if (typeof this.size === 'string') {
          return false
        }
        return this.size > 1073741824 // 1GB
      },
      selectedEpisodeCount() {
        return (this.episodeList as EpisodeItem[]).filter(item => item.checked).length
      },
      dash() {
        return this.dashModel.value === 'dash'
      },
    },
    methods: {
      close() {
        this.$el.classList.remove('opened')
      },
      danmakuOptionChange() {
        settings.downloadVideoDefaultDanmaku = this.danmakuModel.value
      },
      subtitleOptionChange() {
        settings.downloadVideoDefaultSubtitle = this.subtitleModel.value
      },
      // ffmpegChange() {
      //   settings.downloadVideoFfmpegSupport = this.ffmpegModel.value
      // },
      async codecChange() {
        settings.downloadVideoDashCodec = this.codecModel.value
        await this.formatChange()
      },
      async dashChange() {
        // console.log('dash change')
        const format = settings.downloadVideoFormat = this.dashModel.value as typeof settings.downloadVideoFormat
        let updatedFormats = []
        if (format === 'flv') {
          updatedFormats = await VideoFormat.getAvailableFormats()
        } else {
          updatedFormats = await VideoFormat.getAvailableDashFormats()
        }
        formats = updatedFormats
        selectedFormat = getDefaultFormat(formats)
        this.qualityModel.items = updatedFormats.map(f => f.displayName)
        this.qualityModel.value = this.qualityModel.items[formats.indexOf(selectedFormat)]
        await this.formatChange()
      },
      // userSelect 用于区分用户操作和自动更新, 只有用户操作才应更新默认选择的画质
      async formatChange(userSelect = false) {
        // console.log('format change')
        const format = this.getFormat() as VideoFormat
        if (userSelect) {
          settings.downloadVideoQuality = format.quality
        }
        try {
          this.size = '获取大小中'
          const videoDownloader = await format.downloadInfo(this.dash)
          this.size = videoDownloader.totalSize
          // sizeCache.set(format, this.size)
        } catch (error) {
          this.size = '获取大小失败'
          throw error
        }
      },
      getManualFormat() {
        let format: VideoFormat | undefined
        format = allFormats.find(f => f.displayName === this.manualQualityModel.value)
        if (!format) {
          console.error(`No format found. model value = ${this.manualQualityModel.value}`)
          return null
        }
        return format
      },
      getFormat() {
        let format: VideoFormat | undefined
        format = formats.find(f => f.displayName === this.qualityModel.value)
        if (!format) {
          console.error(`No format found. model value = ${this.qualityModel.value}`)
          return null
        }
        return format
      },
      async exportData(type: ExportType) {
        if (this.busy === true) {
          return
        }
        try {
          this.busy = true
          if (this.selectedTab.name === 'batch') {
            await this.exportBatchData(type)
            return
          }
          if (this.selectedTab.name === 'manual') {
            await this.exportManualData(type)
            return
          }
          const format = this.getFormat() as VideoFormat
          const videoDownloader = await format.downloadInfo(this.dash)
          videoDownloader.subtitle = this.subtitle
          switch (type) {
            case 'copyLink':
              await videoDownloader.copyUrl()
              Toast.success('已复制链接到剪贴板.', '下载视频', 3000)
              break
            case 'showLink':
              await videoDownloader.showUrl()
              break
            case 'aria2':
              await videoDownloader.exportAria2(false)
              break
            case 'aria2RPC':
              await videoDownloader.exportAria2(true)
              break
            case 'copyVLD':
              await videoDownloader.exportData(true)
              Toast.success('已复制VLD数据到剪贴板.', '下载视频', 3000)
              break
            case 'exportVLD':
              await videoDownloader.exportData(false)
              break
            case 'ffmpegFragments':
              if (videoDownloader.fragments.length < 2) {
                Toast.info('当前视频没有分段.', '分段合并', 3000)
              } else {
                const { getFragmentsList } = await import('./ffmpeg-support')
                // const { getFragmentsMergeScript } = await import('./ffmpeg-support')

                const pack = new DownloadPackage()
                pack.add('ffmpeg-files.txt', getFragmentsList(videoDownloader.fragments.length, getFriendlyTitle(), videoDownloader.fragments.map(f => videoDownloader.extension(f))))
                // const isWindows = window.navigator.appVersion.includes('Win')
                // const extension = isWindows ? 'bat' : 'sh'
                // const script = getFragmentsMergeScript({
                //   fragments: videoDownloader.fragments,
                //   title: getFriendlyTitle(),
                //   totalSize: videoDownloader.totalSize,
                //   cid: pageData.cid,
                //   referer: document.URL.replace(window.location.search, ''),
                // }, this.dash || videoDownloader.extension())
                // if (isWindows) {
                //   const { GBK } = await import('./gbk')
                //   const data = new Blob([new Uint8Array(GBK.encode(script))])
                //   pack.add(`${getFriendlyTitle()}.${extension}`, data)
                // } else {
                //   pack.add(`${getFriendlyTitle()}.${extension}`, script)
                // }
                await pack.emit()
              }
              break
            case 'idm':
              await videoDownloader.exportIdm()
              break
            default:
              break
          }
        } catch (error) {
          logError(error)
        } finally {
          this.busy = false
        }
      },
      async exportBatchData(type: ExportType) {
        const episodeList = this.episodeList as EpisodeItem[]
        const { MaxBatchSize, showBatchWarning } = await import('./batch-warning')
        if (episodeList.every(item => !item.checked)) {
          Toast.info('请至少选择1集或以上的数量!', '批量导出', 3000)
          return
        }
        if (episodeList.filter(item => item.checked).length > MaxBatchSize) {
          showBatchWarning('批量导出')
          return
        }
        const episodeFilter = (item: EpisodeItem) => {
          const match = episodeList.find((it: EpisodeItem) => it.cid === item.cid) as EpisodeItem | undefined
          if (match === undefined) {
            return false
          }
          return match.checked
        }
        const batchExtractor = this.batchExtractor as BatchExtractor
        const format: VideoFormat = this.getFormat()
        if (this.danmakuModel.value !== '无') {
          const danmakuToast = Toast.info('下载弹幕中...', '批量导出')
          const pack = new DownloadPackage()
          try {
            if (this.danmakuModel.value === 'XML') {
              for (const item of episodeList.filter(episodeFilter)) {
                const danmakuInfo = new DanmakuInfo(item.cid)
                await danmakuInfo.fetchInfo()
                pack.add(batchExtractor.formatTitle(item.titleParameters) + '.xml', danmakuInfo.rawXML)
              }
            } else {
              const { convertToAss } = await import('../download-danmaku')
              for (const item of episodeList.filter(episodeFilter)) {
                const danmakuInfo = new DanmakuInfo(item.cid)
                await danmakuInfo.fetchInfo()
                pack.add(batchExtractor.formatTitle(item.titleParameters) + '.ass', await convertToAss(danmakuInfo.rawXML))
              }
            }
            await pack.emit(this.cid + '.danmakus.zip')
          } catch (error) {
            logError(`弹幕下载失败`)
            throw error
          } finally {
            danmakuToast.dismiss()
          }
        }
        if (this.subtitleModel.value !== '无') {
          const subtitleToast = Toast.info('下载字幕中...', '批量导出')
          const pack = new DownloadPackage()
          try {
            const { getSubtitleConfig, getSubtitleList } = await import('../download-subtitle/download-subtitle')
            const [config, language] = await getSubtitleConfig()
            for (const item of episodeList.filter(episodeFilter)) {
              const subtitles = await getSubtitleList(item.aid, item.cid)
              const subtitle = subtitles.find(s => s.language === language) || subtitles[0]
              if (subtitle === undefined) {
                continue
              }
              const json = await Ajax.getJson(subtitle.url)
              const rawData = json.body
              if (this.subtitleModel.value === 'JSON') {
                pack.add(batchExtractor.formatTitle(item.titleParameters) + '.json', rawData)
              } else {
                const { SubtitleConverter } = await import('../download-subtitle/subtitle-converter')
                const converter = new SubtitleConverter(config)
                const ass = await converter.convertToAss(rawData)
                pack.add(batchExtractor.formatTitle(item.titleParameters) + '.ass', ass)
              }
            }
            await pack.emit(this.cid + '.subtitles.zip')
          } catch (error) {
            logError(`字幕下载失败`)
            throw error
          } finally {
            subtitleToast.dismiss()
          }
        }
        const toast = Toast.info('获取链接中...', '批量导出')
        batchExtractor.config.itemFilter = episodeFilter
        batchExtractor.config.api = await pageData.entity.getApiGenerator(this.dash)
        let result: string
        try {
          switch (type) {
            case 'idm':
              const items = await batchExtractor.getRawItems(format)
              const { toIdmFormat } = await import('./idm-support')
              result = toIdmFormat(items)
              await DownloadPackage.single(
                getFriendlyTitle(false) + '.ef2',
                new Blob([result], { type: 'text/plain' }),
              )
              return
            case 'aria2':
              result = await batchExtractor.collectAria2(format, toast, false)
              await DownloadPackage.single(
                getFriendlyTitle(false) + '.txt',
                new Blob([result], { type: 'text/plain' }),
              )
              return
            case 'aria2RPC':
              await batchExtractor.collectAria2(format, toast, true)
              Toast.success(`成功发送了批量请求.`, 'aria2 RPC', 3000)
              return
            case 'copyVLD':
              GM.setClipboard(await batchExtractor.collectData(format, toast), { mimetype: 'text/plain' })
              Toast.success('已复制批量vld数据到剪贴板.', '批量导出', 3000)
              return
            case 'exportVLD':
              result = await batchExtractor.collectData(format, toast)
              await DownloadPackage.single(
                getFriendlyTitle(false) + '.json',
                new Blob([result], { type: 'text/json' }),
              )
              return
            case 'ffmpegFragments':
              {
                const items = await batchExtractor.getRawItems(format)
                if (items.every(it => it.fragments.length < 2)) {
                  Toast.info('所有选择的分P都没有分段.', '分段列表', 3000)
                  return
                }
                const videoDownloader = new VideoDownloader(format, items[0].fragments)
                const { getBatchFragmentsList } = await import('./ffmpeg-support')
                // const pack = new DownloadPackage()
                // const isWindows = window.navigator.appVersion.includes('Win')
                // const extension = isWindows ? 'bat' : 'sh'
                // const script = getBatchMergeScript(items, videoDownloader.extension())
                // if (isWindows) {
                //   const { GBK } = await import('./gbk')
                //   const data = new Blob([new Uint8Array(GBK.encode(script))])
                //   pack.add(`${getFriendlyTitle()}.${extension}`, data)
                // } else {
                //   pack.add(`${getFriendlyTitle()}.${extension}`, script)
                // }
                // await pack.emit()

                const map = getBatchFragmentsList(items, this.dash || videoDownloader.extension())
                if (!map) {
                  Toast.info('所有选择的分P都没有分段.', '分段列表', 3000)
                  return
                }
                const pack = new DownloadPackage()
                for (const [filename, content] of map.entries()) {
                  pack.add(filename, content)
                }
                await pack.emit(escapeFilename(`${getFriendlyTitle(false)}.zip`))
                // }
              }
              break
            case 'ffmpegEpisodes':
              {
                const items = await batchExtractor.getRawItems(format)
                const videoDownloader = new VideoDownloader(format, items[0].fragments)
                const { getBatchEpisodesList } = await import('./ffmpeg-support')
                const content = getBatchEpisodesList(items, this.dash || videoDownloader.extension())
                const pack = new DownloadPackage()
                pack.add('ffmpeg-files.txt', content)
                await pack.emit()
              }
              break
            default:
              return
          }
        } catch (error) {
          logError(error)
        } finally {
          toast.dismiss()
        }
      },
      async exportManualData(type: ExportType) {
        const { MaxBatchSize, showBatchWarning } = await import('./batch-warning')
        if (this.manualInputItems.length === 0) {
          Toast.info('请至少输入一个有效的视频链接!', '手动输入', 3000)
          return
        }
        if (this.manualInputItems.length > MaxBatchSize) {
          showBatchWarning('手动输入')
          return
        }
        const { ManualInputBatch } = await import('./batch-download')
        const batch = new ManualInputBatch({
          api: await (new Video().getApiGenerator(this.dash)),
          itemFilter: () => true,
        })
        batch.items = this.manualInputItems
        if (this.danmakuModel.value !== '无') {
          const danmakuToast = Toast.info('下载弹幕中...', '手动输入')
          const pack = new DownloadPackage()
          try {
            if (this.danmakuModel.value === 'XML') {
              for (const item of (await batch.getItemList())) {
                const danmakuInfo = new DanmakuInfo(item.cid)
                await danmakuInfo.fetchInfo()
                pack.add(ManualInputBatch.formatTitle(item.titleParameters) + '.xml', danmakuInfo.rawXML)
              }
            } else {
              const { convertToAss } = await import('../download-danmaku')
              for (const item of (await batch.getItemList())) {
                const danmakuInfo = new DanmakuInfo(item.cid)
                await danmakuInfo.fetchInfo()
                pack.add(ManualInputBatch.formatTitle(item.titleParameters) + '.ass', await convertToAss(danmakuInfo.rawXML))
              }
            }
            await pack.emit('manual-exports.danmakus.zip')
          } catch (error) {
            logError(`弹幕下载失败`)
            throw error
          } finally {
            danmakuToast.dismiss()
          }
        }
        if (this.subtitleModel.value !== '无') {
          const subtitleToast = Toast.info('下载字幕中...', '批量导出')
          const pack = new DownloadPackage()
          try {
            const { getSubtitleConfig, getSubtitleList } = await import('../download-subtitle/download-subtitle')
            const [config, language] = await getSubtitleConfig()
            for (const item of (await batch.getItemList())) {
              const subtitles = await getSubtitleList(item.aid, item.cid)
              const subtitle = subtitles.find(s => s.language === language) || subtitles[0]
              const json = await Ajax.getJson(subtitle.url)
              const rawData = json.body
              if (this.subtitleModel.value === 'JSON') {
                pack.add(ManualInputBatch.formatTitle(item.titleParameters) + '.json', rawData)
              } else {
                const { SubtitleConverter } = await import('../download-subtitle/subtitle-converter')
                const converter = new SubtitleConverter(config)
                const ass = await converter.convertToAss(rawData)
                pack.add(ManualInputBatch.formatTitle(item.titleParameters) + '.ass', ass)
              }
            }
            await pack.emit('manual-exports.subtitles.zip')
          } catch (error) {
            logError(`字幕下载失败`)
            throw error
          } finally {
            subtitleToast.dismiss()
          }
        }
        const toast = Toast.info('获取链接中...', '手动输入')
        try {
          switch (type) {
            default:
            case 'aria2': {
              const result = await batch.collectAria2(this.getManualFormat().quality, false) as string
              await DownloadPackage.single(
                'manual-exports.txt',
                new Blob([result], { type: 'text/plain' }),
              )
              break
            }
            case 'aria2RPC': {
              await batch.collectAria2(this.getManualFormat().quality, true)
              Toast.success(`成功发送了批量请求.`, 'aria2 RPC', 3000)
              break
            }
            case 'idm': {
              const items = await batch.getRawItems(this.getManualFormat().quality)
              const { toIdmFormat } = await import('./idm-support')
              const result = toIdmFormat(items)
              await DownloadPackage.single(
                'manual-exports.ef2',
                new Blob([result], { type: 'text/plain' }),
              )
              break
            }
          }
        } catch (error) {
          logError(error)
        } finally {
          toast.dismiss()
        }
      },
      async checkBatch() {
        const urls = [
          '//www.bilibili.com/bangumi',
          '//www.bilibili.com/video',
          '//www.bilibili.com/blackboard/bnj2020.html'
        ]
        if (!urls.some(url => document.URL.includes(url))) {
          this.batch = false
          this.episodeList = []
          return
        }
        const { BatchExtractor } = await import('./batch-download')
        const { MaxBatchSize } = await import('./batch-warning')
        if (await BatchExtractor.test() !== true) {
          this.batch = false
          this.episodeList = []
          return
        }
        const batchExtractor = this.batchExtractor = new BatchExtractor()
        this.batch = true
        this.episodeList = (await batchExtractor.getItemList()).map((item, index) => {
          return {
            aid: item.aid,
            cid: item.cid,
            title: item.title,
            titleParameters: item.titleParameters,
            index,
            checked: index < MaxBatchSize,
          } as EpisodeItem
        })
      },
      async checkSubtitle() {
        const { getSubtitleList } = await import('../download-subtitle/download-subtitle')
        const subtitles = await getSubtitleList(pageData.aid, pageData.cid)
        this.subtitle = subtitles.length > 0
      },
      cancelDownload() {
        if (workingDownloader) {
          workingDownloader.cancelDownload()
        }
      },
      async startDownload() {
        const format = this.getFormat() as VideoFormat
        if (format.quality === 120) {
          Toast.info('4K视频不支持直接下载, 请使用下方的导出选项.', '下载视频', 5000)
          return
        }
        try {
          this.downloading = true
          const videoDownloader = await format.downloadInfo(this.dash)
          videoDownloader.subtitle = this.subtitle
          videoDownloader.videoSpeed.speedUpdate = speed => this.speed = speed
          videoDownloader.progress = percent => {
            this.progressPercent = Math.trunc(percent * 100)
          }
          workingDownloader = videoDownloader
          await videoDownloader.download()
          this.lastDirectDownloadLink = DownloadPackage.lastPackageUrl
        }
        catch (error) {
          if (error !== 'canceled') {
            logError(error)
          }
          this.progressPercent = 0
        }
        finally {
          this.downloading = false
          this.speed = ''
        }
      },
      selectAllEpisodes() {
        this.episodeList.forEach((item: EpisodeItem) => item.checked = true)
      },
      unselectAllEpisodes() {
        this.episodeList.forEach((item: EpisodeItem) => item.checked = false)
      },
      inverseAllEpisodes() {
        this.episodeList.forEach((item: EpisodeItem) => item.checked = !item.checked)
      },
      shiftToggleEpisodes(e: MouseEvent, index: number) {
        if (!e.shiftKey || this.lastCheckedEpisodeIndex === -1) {
          console.log('set lastCheckedEpisodeIndex', index)
          this.lastCheckedEpisodeIndex = index
          return
        }
        if (e.shiftKey && this.lastCheckedEpisodeIndex !== -1) {
          (this.episodeList as EpisodeItem[])
            .slice(
              Math.min(this.lastCheckedEpisodeIndex, index) + 1,
              Math.max(this.lastCheckedEpisodeIndex, index),
            )
            .forEach(it => {
              it.checked = !it.checked
            })
          console.log('shift toggle',
            Math.min(this.lastCheckedEpisodeIndex, index) + 1,
            Math.max(this.lastCheckedEpisodeIndex, index),
          )
          this.lastCheckedEpisodeIndex = index
          e.preventDefault()
        }
      },
      toggleRpcSettings() {
        this.showRpcSettings = !this.showRpcSettings
      },
      saveRpcSettings() {
        if (this.rpcSettings.host === '') {
          this.rpcSettings.host = '127.0.0.1'
        }
        if (this.rpcSettings.port === '') {
          this.rpcSettings.port = '6800'
        }
        settings.aria2RpcOption = this.rpcSettings
        const profile = settings.aria2RpcOptionProfiles.find(p => p.name === settings.aria2RpcOptionSelectedProfile)
        if (profile) {
          Object.assign(profile, this.rpcSettings)
          settings.aria2RpcOptionProfiles = settings.aria2RpcOptionProfiles
        }
        this.saveRpcSettingsText = '已保存'
        setTimeout(() => this.saveRpcSettingsText = '保存配置', 2000)
      },
      updateProfile(profile: RpcOptionProfile) {
        settings.aria2RpcOption = this.rpcSettings = _.omit(profile, 'name') as RpcOption
      }
    },
    async mounted() {
      // if (settings.downloadVideoFormat === 'dash') {
      //   console.log('init set dash')
      //   this.dashModel.value = 'dash'
      //   await this.dashChange()
      // }
    }
  })
  // const vueCreated = performance.now()
  const el = panel.$mount().$el
  document.body.insertAdjacentElement('beforeend', el)
  // const vueMounted = performance.now()
  // el.classList.add('loaded')
  // const repainted = performance.now()
  // console.log(vueCreated - start, vueMounted - vueCreated, repainted - vueMounted)
  Observer.videoChange(async () => {
    panel.close()
    panel.batch = false
    panel.selectedTab = panelTabs[0]
    const button = dq('#download-video') as HTMLElement
    const canDownload = await loadPageData()
    button.style.display = canDownload ? 'flex' : 'none'
    if (!canDownload) {
      return
    }

    panel.aid = pageData.aid
    panel.cid = pageData.cid
    try {
      const videoInfo = new VideoInfo(pageData.aid)
      await videoInfo.fetchInfo()
      panel.coverUrl = videoInfo.coverUrl.replace('http:', 'https:')
    } catch (error) {
      panel.coverUrl = EmptyImageUrl
    }
    panel.dashChange()
    panel.checkSubtitle()
    await panel.checkBatch()
  })
}

export default {
  widget: {
    content: /*html*/`
      <button class="gui-settings-flat-button" style="position: relative; z-index: 100;" id="download-video">
        <i class="icon-download"></i>
        <span>下载视频</span>
      </button>`,
    condition: loadPageData,
    success: loadWidget,
  },
}
