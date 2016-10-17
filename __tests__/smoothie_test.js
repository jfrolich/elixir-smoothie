const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const readFile = (filename) => fs.readFileSync(filename, { encoding: 'utf-8' })
const snapshot = (filename) => readFile(path.join('__tests__', 'data', 'snapshots', filename));
const build = (templateDir, filename) => readFile(path.join('__tests__', 'data', templateDir, 'build', filename));

PROCESS_ENV = process.env;

const runScript = (opts = {}) => new Promise((resolve, reject) => {
  exec("./index.js", opts, (error, stdout, stderr) => {
    // console.error(stderr)
    if (error) reject(error)
    else resolve({stdout, stderr});
  })
})

test('expect to fail when no template dir specified', () => {
  return runScript().then(({stderr}) => expect(stderr).toBe('Error: No template dir specified\n'))
});

test('handle templates without layouts', () =>
  runScript({env: Object.assign(PROCESS_ENV, {
    SMOOTHIE_TEMPLATE_DIR: '__tests__/data/simple'
  })})
  .then(() => {
    const html = 'template_simple.html.eex';
    const txt = 'template_simple.txt.eex';
    expect(build('simple', html)).toEqual(snapshot(html));
    expect(build('simple', txt)).toEqual(snapshot(txt));
  })
)

test('handle templates with foundation', () =>
  runScript({env: Object.assign(PROCESS_ENV, {
    SMOOTHIE_TEMPLATE_DIR: '__tests__/data/simple_with_foundation',
    SMOOTHIE_USE_FOUNDATION: 'true'
  })})
  .then(() => {
    const html = 'template_simple_with_foundation.html.eex';
    const txt = 'template_simple_with_foundation.txt.eex';
    expect(build('simple_with_foundation', html)).toEqual(snapshot(html));
    expect(build('simple_with_foundation', txt)).toEqual(snapshot(txt));
  })
)

test('handle layout file not found', () =>
  runScript({env: Object.assign(PROCESS_ENV, {
    SMOOTHIE_TEMPLATE_DIR: '__tests__/data/simple',
    SMOOTHIE_LAYOUT_FILE:  '__tests__/data/layout/wrong.html.eex',
    SMOOTHIE_USE_FOUNDATION: 'false'
  })})
  .then(({stderr}) => {
    expect(stderr).toBe('Error: Layout file not found\n');
  })
)


test('handle templates with layouts', () =>
  runScript({env: Object.assign(PROCESS_ENV, {
    SMOOTHIE_TEMPLATE_DIR: '__tests__/data/simple_with_layout',
    SMOOTHIE_LAYOUT_FILE:  '__tests__/data/layout/layout.html.eex',
    SMOOTHIE_USE_FOUNDATION: 'false'

  })})
  .then(() => {
    const html = 'template_simple_with_layout.html.eex';
    const txt = 'template_simple_with_layout.txt.eex';
    expect(build('simple_with_layout', html)).toEqual(snapshot(html));
    expect(build('simple_with_layout',txt)).toEqual(snapshot(txt));
  })
)

test('handle templates with layouts and sass', () =>
  runScript({env: Object.assign(PROCESS_ENV, {
    SMOOTHIE_TEMPLATE_DIR: '__tests__/data/simple_with_layout_and_stylesheet',
    SMOOTHIE_LAYOUT_FILE:  '__tests__/data/layout/layout.html.eex',
    SMOOTHIE_SCSS_FILE: '__tests__/data/css/style.scss',
    SMOOTHIE_USE_FOUNDATION: 'false'
  })})
  .then(({stdout}) => {
    const html = 'template_simple_with_layout_and_stylesheet.html.eex';
    const txt = 'template_simple_with_layout_and_stylesheet.txt.eex';
    expect(build('simple_with_layout_and_stylesheet', html)).toEqual(snapshot(html));
    expect(build('simple_with_layout_and_stylesheet', txt)).toEqual(snapshot(txt));
  })
)
