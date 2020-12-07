import { NavbarComponent } from '../custom-navbar-component'
export class Upload extends NavbarComponent {
  constructor() {
    super()
    this.href = 'https://member.bilibili.com/v2#/upload/video/frame'
    this.html = /*html*/`
      <svg style="width:16px;height:16px;padding:3px;box-sizing:content-box;" viewBox="0 0 785 886">
        <path d="M582,374L582,566C582,585.333 576.167,600.833 564.5,612.5C552.833,624.167 537.333,630 518,630L262,630C242.667,630 227.167,624.167 215.5,612.5C203.833,600.833 198,585.333 198,566L198,374L32,374C22,374 14.1667,371.167 8.5,365.5C2.83333,359.833 0,352 0,342C0,338.667 1.16666,334.5 3.5,329.5C5.83333,324.5 8.66666,320 12,316L371,9C377.667,3.00006 385.167,6.10352e-005 393.5,0C401.833,6.10352e-005 409.333,3.00006 416,9L774,316C780,322.667 783.333,330.167 784,338.5C784.667,346.833 783.333,354.333 780,361L764,370C760,372.667 754.667,374 748,374ZM70,758L710,758C729.333,758 744.833,763.833 756.5,775.5C768.167,787.167 774,802.667 774,822C774,841.333 768.167,856.833 756.5,868.5C744.833,880.167 729.333,886 710,886L70,886C50.6667,886 35.1667,880.167 23.5,868.5C11.8333,856.833 6,841.333 6,822C6,802.667 11.8333,787.167 23.5,775.5C35.1667,763.833 50.6667,758 70,758Z" />
      </svg>
      <div id="upload-button">投稿</div>`
    this.popupHtml = /*html*/`
      <ul id="upload-actions">
        <li><a target="_blank" href="https://member.bilibili.com/platform/upload/text/apply">专栏投稿</a></li>
        <li><a target="_blank" href="https://member.bilibili.com/platform/upload/audio/">音频投稿</a></li>
        <li><a target="_blank" href="https://member.bilibili.com/platform/upload/video/frame">视频投稿</a></li>
        <li><a target="_blank" href="https://member.bilibili.com/platform/upload-manager/article">投稿管理</a></li>
        <li><a target="_blank" href="https://member.bilibili.com/platform/home">创作中心</a></li>
      </ul>
    `
  }
  get name(): keyof CustomNavbarOrders {
    return 'upload'
  }
}
export default {
  export: {
    Upload,
  },
}