const puppeteer = require('puppeteer');
const fs = require('fs')
const prompt = require('prompt')

const input_search = '#query'
const s_article = '#searchForm > div > input.swz'
const s_gongzhonghao = '#searchForm > div > input.swz2'

const input_search1 = '#query'
const s_article1 = '#scroll-header > form > div > input.swz'
const s_gongzhonghao1 = '#scroll-header > form > div > input.swz2'

const first_result1 = '.news-box li > div > div.txt-box > p.tit > a'

const messages2 = 'h4[class="weui_media_title"]'

let gongzhonghao_list = [
  '机器之心',
  '量子位',
  '泡泡机器人',
  '车云',
  '智东西',
  'Xtecher',
  '新智元',
  '将门创投',
  'AI研习社',
  '车东西',
  '优达学城Udacity',
  'tensorflowers',
  '宇辰网无人机资讯',
  '智能制造',
  '新智驾',
  '环球科学',
  'AI科技评论',
  '谷歌开发者',
  'Python开发者',
  'DroneDev',
  '微软研究院AI头条',
  '人工智能和机器人研究院'
];

const newPagePromise = (browser) => {
  return new Promise((resolve) => {
    browser.once('targetcreated', (target) => {
      resolve(target.page())
    })
  })
}


const loop = async (head_index, search, gongzhonghao, browser, page, keyword) => {
  let input_search$ = await page.$(search)
  await input_search$.click()

  // clear the input
  await page.keyboard.down('ControlLeft');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('ControlLeft');
  await page.keyboard.press('Delete');

  await input_search$.type(keyword)
  let s_gongzhonghao$ = await page.$(gongzhonghao)
  await s_gongzhonghao$.click()
  // page jump
  await page.waitForNavigation()

  let first_result1$ = await page.$(first_result1)
  await first_result1$.click()


  let newPage = await newPagePromise(browser);
  newPage.on('dialog', async dialog => {
    console.log(dialog.message());
    await dialog.dismiss();
    await newPage.reload();
  });

  await newPage.bringToFront();

  await newPage.reload({
    waitUntil: 'load'
  })

  let title = await newPage.title()

  const prompt_captcha = async () => {
    return new Promise((resolve, reject) => {
      prompt.get('captcha', async (err, result) => {
        if (err) reject(err);
        else {
          resolve(result.captcha);
        }
      });
    })
  }

  while (title == '请输入验证码') {
    prompt.start();
    let captcha_result = await prompt_captcha();
    let input$ = await newPage.$('#input')
    await input$.type(captcha_result)

    let enter_input$ = await newPage.$('#bt')

    await enter_input$.click()

    await newPage.reload()

    title = await newPage.title();
    console.log(`new title: ${title}`)
  }

  let url = newPage.url()

  head_index.push(`[${title}](#${title.toLowerCase()}) [:link:](${url})\n`)
  let lists = [`## ${title.toLowerCase()} \n ---`]

  let messages2$ = await newPage.$$(messages2)
  for (let msg of messages2$) {
    let headline = (await newPage.evaluate(e => e.textContent, msg)).replace(/\s/g, '').replace(/\|/g, '\\\|')
    let article_url = 'http://mp.weixin.qq.com' + await newPage.evaluate(e => e.getAttribute('hrefs'), msg)
    let entry = `[${headline}](${article_url})\n`
    lists.push(entry)
  }

  newPage.close()

  return lists;
}

const main = async () => {
  let headless = true
  if (process.argv[2] == 'head') {
    headless = false
  }
  const browser = await puppeteer.launch({
    headless: headless
  });

  let pages = await browser.pages();
  let page = pages[0];

  await page.goto('http://weixin.sogou.com');

  let head_index = []
  let all_lines = []

  for (let i = 0; i < gongzhonghao_list.length; i++) {
    let lines, search, gongzhonghao
    let keyword = gongzhonghao_list[i];
    if (i == 0) {
      search = input_search
      gongzhonghao = s_gongzhonghao
    } else {
      search = input_search1
      gongzhonghao = s_gongzhonghao1
    }
    lines = await loop(head_index, search, gongzhonghao, browser, page, keyword)
    all_lines = all_lines.concat(lines)
  }

  all_lines = head_index.concat(all_lines)
  let markdown_content = all_lines.join('\n')

  fs.writeFileSync('index.md', markdown_content, 'utf8')
  browser.close();
}

process.on('SIGINT', () => {
})

main()