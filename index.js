#!/usr/bin/env node

const htmlToText = require('html-to-text');
const juice = require('juice');
const fs = require('fs');
const path = require('path');
const sass = require('node-sass');
const Inky = require('inky').Inky;
const cheerio = require('cheerio');
const utils = require('./utils');
const chalk = require('chalk');

const TEMPLATE_DIR = process.env.SMOOTHIE_TEMPLATE_DIR;
const LAYOUT_FILE = process.env.SMOOTHIE_LAYOUT_FILE ? process.env.SMOOTHIE_LAYOUT_FILE : undefined;
const CSS_FILE = process.env.SMOOTHIE_CSS_FILE ? process.env.SMOOTHIE_CSS_FILE : undefined;
const SCSS_FILE = process.env.SMOOTHIE_SCSS_FILE ? process.env.SMOOTHIE_SCSS_FILE : undefined;
const USE_FOUNDATION = process.env.SMOOTHIE_USE_FOUNDATION ? (process.env.SMOOTHIE_USE_FOUNDATION == 'true') : false;

class SmoothieException {
  constructor(message) {
    this.message = message;
  }
}

try {
  if (!TEMPLATE_DIR) throw(new SmoothieException("No template dir specified"))
  // fs.accessSync(TEMPLATE_DIR, fs.F_OK);

  const BUILD_DIR = path.join(TEMPLATE_DIR, 'build');
  const FOUNDATION_STYLE_PATH = path.join('node_modules/foundation-emails/dist', 'foundation-emails.css');

  const JUICE_OPTIONS = {
      preserveImportant: true
  };


  console.log('Preparing to compile the following template files:');
  const templateFiles = fs.readdirSync(TEMPLATE_DIR).filter(file => file.includes('.eex'));
  console.log(templateFiles.map(file => '- ' + file).join('\n'))

  let css = ''

  if (SCSS_FILE) {
    css = sass.renderSync({ file: SCSS_FILE }).css
  } else if(CSS_FILE) {
    css = fs.readFileSync(file_path, 'utf8');
  }

  let layout = '';
  try {
    layout = LAYOUT_FILE ? fs.readFileSync(LAYOUT_FILE, 'utf8') : '{content}';
  } catch (e) {
    if ( e.code != 'EEXIST' ) throw new SmoothieException('Layout file not found');
    else throw(e)
  }

  const escapeEex = text => text.replace(/<%(.*?)%>/g, (match, p1) => `{{{${p1}}}}`);
  const unescapeEex = text => text.replace(/{{{(.*?)}}}/g, (match, p1) => `<%${p1}%>`);
  const wrapEex = text => text.replace(/<%(.*?)%>/g, match =>  `<!-- ${match} -->`);
  const unwrapEex = text => text.replace(/<!-- <%(.*?)%> -->/g, (match, p1) => `<%${p1}%>`)
  const compileInky = $ => (new Inky({})).releaseTheKraken($)

  templateFiles.forEach(file => {
    let template = fs.readFileSync(path.join(TEMPLATE_DIR, file), { encoding: 'utf-8' });
    template = layout.replace('{content}', template);

    let $ = cheerio.load(wrapEex(template), {xmlMode: true});

    const templateCss = $('style').contents().toArray().reduce((prev, curr) => prev + curr.data, '');
    $('style').remove();

    template = USE_FOUNDATION ? compileInky($) : $.html();
    template = unwrapEex(template);

    const completeCss = css + templateCss;
    const juicedTemplate = juice.inlineContent(template, completeCss);
    const textTemplate = unescapeEex(htmlToText.fromString(escapeEex(template), {
      uppercaseHeadings: false,
    }));

    try { fs.mkdirSync(path.join(TEMPLATE_DIR, 'build')) }
    catch(e) {
      if ( e.code != 'EEXIST' ) throw e;
    }

    fs.writeFileSync(
      path.join(TEMPLATE_DIR, 'build', file),
      juicedTemplate
    );

    console.log('Created ' + file)

    fs.writeFileSync(
      path.join(TEMPLATE_DIR, 'build', file.replace('html.eex', 'txt.eex')),
      textTemplate
    );

    console.log('Created ' + file.replace('html.eex', 'txt.eex'))
  })
  console.log('Done 🙏');
} catch(error) {
  if (error instanceof SmoothieException) {
    console.error(chalk.bold(chalk.underline(chalk.red('Error:'))), error.message)
  } else {
    throw(error)
  }
}
