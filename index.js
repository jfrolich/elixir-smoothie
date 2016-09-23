#!/usr/bin/env node

const htmlToText = require('html-to-text');
const juice = require('juice');
const fs = require('fs');
const path = require('path');
const sass = require('node-sass');

const TEMPLATE_DIR = process.env.MAIL_TEMPLATE_DIR ? process.env.MAIL_TEMPLATE_DIR : 'web/mailers/templates';

console.log('Preparing to compile the following template files:')
const templateFiles =
  fs.readdirSync(TEMPLATE_DIR).filter(file => file.includes('.eex'));
console.log(templateFiles.map(file => '- ' + file).join('\n'))

sass.render({ file: path.join(TEMPLATE_DIR, 'layout', 'style.scss') }, function(err, result) {
  // if a style.scss file is found write style.css in the same directory
  if (result) fs.writeFileSync(path.join(TEMPLATE_DIR, 'layout', 'style.css'), result.css);

  const layout = fs.readFileSync(path.join(TEMPLATE_DIR, 'layout', 'layout.html.eex'), { encoding: 'utf-8' });
  const css = fs.readFileSync(path.join(TEMPLATE_DIR, 'layout', 'style.css'), { encoding: 'utf-8' });

  templateFiles.forEach(file => {
    const template = fs.readFileSync(path.join(TEMPLATE_DIR, file), { encoding: 'utf-8' });
    const completeTemplate = layout.replace('{content}', template);
    const juicedTemplate = juice.inlineContent(completeTemplate, css);

    const textTemplate = htmlToText.fromString(completeTemplate.replace(/<%=/g, '{').replace(/%>/g, '}'), {
      uppercaseHeadings: false,
    }).replace(/{/g, '<%=').replace(/}/g, '%>');

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
});
