import puppeteer from 'puppeteer';
import { glob } from 'glob';
import { readFile, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';

const POSTS_GLOB = 'src/content/posts/*/*.md';
const TEMPLATE_PATH = 'scripts/preview-template.html';

async function getPosts() {
  return glob(POSTS_GLOB);
}

async function createPreviewImage(postPath, template) {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium' });
  const page = await browser.newPage();

  const postContent = await readFile(postPath, 'utf-8');
  const title = postContent.match(/title: (.*)/)[1];

  const content = template.replace('<h1></h1>', `<h1>${title}</h1>`);

  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(content, { waitUntil: 'networkidle0' });

  const previewImagePath = join(dirname(postPath), 'preview.png');
  await page.screenshot({ path: previewImagePath });

  await browser.close();

  return previewImagePath;
}

async function updatePostFrontmatter(postPath, previewImagePath) {
  let content = await readFile(postPath, 'utf-8');
  const imageName = basename(previewImagePath);
  const imageLine = `image: ${imageName}`;

  if (content.includes('image:')) {
    content = content.replace(/image:.*/, imageLine);
  } else {
    content = content.replace('---', `---\n${imageLine}`);
  }

  await writeFile(postPath, content);
}

async function generateTags(postContent) {
  // TODO: Replace with actual LLM call
  return ['creative-coding', 'generative-art', 'javascript'];
}

async function updatePostFrontmatterWithTags(postPath, tags) {
  let content = await readFile(postPath, 'utf-8');
  const tagsLine = `tags: [${tags.map(t => `'${t}'`).join(', ')}]`;

  if (content.includes('tags:')) {
    content = content.replace(/tags:.*/, tagsLine);
  } else {
    content = content.replace('---', `---\n${tagsLine}`);
  }

  await writeFile(postPath, content);
}

async function main() {
  const posts = await getPosts();
  const template = await readFile(TEMPLATE_PATH, 'utf-8');

  for (const post of posts) {
    console.log(`Generating preview for ${post}`);
    const previewImagePath = await createPreviewImage(post, template);
    await updatePostFrontmatter(post, previewImagePath);
    console.log(`  -> ${previewImagePath}`);

    console.log(`Generating tags for ${post}`);
    const postContent = await readFile(post, 'utf-8');
    const tags = await generateTags(postContent);
    await updatePostFrontmatterWithTags(post, tags);
    console.log(`  -> ${tags.join(', ')}`);
  }
}

main();
