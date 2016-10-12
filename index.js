#!/usr/bin/env node

const htmlToText = require('html-to-text');
const juice = require('juice');
const fs = require('fs');
const path = require('path');
const del = require('del');
const sass = require('node-sass');
const inky = require('inky');
const cheerio = require('cheerio');
const utils = require('./utils');
const TEMPLATE_DIR = process.env.MAIL_TEMPLATE_DIR ? process.env.MAIL_TEMPLATE_DIR : 'web/mailers/templates';
const LAYOUT_DIR = process.env.LAYOUT_TEMPLATE_DIR ? process.env.LAYOUT_TEMPLATE_DIR : 'web/mailers/templates/layout';
const BUILD_DIR = path.join(TEMPLATE_DIR, 'build');
const FOUNDATION_STYLE_PATH = path.join('node_modules/foundation-emails/dist', 'foundation-emails.css');
const LAYOUT_STYLES_PATH = function () {
    try {
        if (fs.statSync(path.join(LAYOUT_DIR, 'style.css')).isFile() == true) {
            return path.join(LAYOUT_DIR, 'style.css');
        }
    } catch (e) {
        try {
            if (fs.statSync(path.join(LAYOUT_DIR, 'style.scss')).isFile()) {
                return path.join(LAYOUT_DIR, 'style.scss');
            }
        } catch (e) {
            throw(e);
        }
    }
};
const JUICE_OPTIONS = {
    preserveImportant: true
};
const ENV_OPTIONS = {
    USE_FOUNDATION: process.env.USE_FOUNDATION_EMAILS ? (process.env.USE_FOUNDATION_EMAILS == 'true') : false,
    USE_LAYOUT: process.env.USE_LAYOUT ? (process.env.USE_LAYOUT == 'true') : false
};


console.log('Preparing to compile the following template files:');


// getting the template files
let getTemplates = function () {
    console.log("getting template files");
    let templateFiles = fs.readdirSync(TEMPLATE_DIR).filter(file => file.includes('.eex'));
    console.log(templateFiles);
    return templateFiles;
};


// creating a working copy of the `.html.eex` as `.html` for all template partial files into the build folder
let createTemplateCopies = function (templateFiles) {
    console.log("copying the template files to the build folder");
    templateFiles.forEach(function (file) {
        let file_path = path.join(TEMPLATE_DIR, file);
        let new_file_path = path.join(BUILD_DIR, file).replace('.eex', '');
        console.log(`copying ${file_path} to ${new_file_path}`);
        let template = fs.readFileSync(file_path, 'utf8');
        let templateWithRawTags = utils.wrapEexTagsInRawTags(template);
        fs.writeFileSync(new_file_path, templateWithRawTags, 'utf8');
    });
};

// creating a working copy of the layout template and put it in the build folder
let createLayoutCopy = function () {
    console.log("creating a copy of the layout template");
    let prevLayoutPath = path.join(LAYOUT_DIR, 'layout.html.eex');
    let newLayoutPath = path.join(BUILD_DIR, 'layout.html').replace('.eex', '');
    console.log(`copying ${prevLayoutPath} to ${newLayoutPath}`);
    fs.writeFileSync(newLayoutPath, fs.readFileSync(prevLayoutPath, 'utf8'), 'utf8');
};


// get copied template files
let getCopiedTemplates = function () {
    console.log("getting copied template files");
    return fs.readdirSync(BUILD_DIR)
        .filter(file => file.includes('.eex') == false &&
            file.includes('layout.html') == false
        );
};


// get layout css
let getLayoutCss = function () {
    console.log('getting layout scss/css styles');
    let layoutCss = '';
    if (ENV_OPTIONS.USE_LAYOUT == true) {
        layoutCss += fs.readFileSync(FOUNDATION_STYLE_PATH);
    }
    layoutCss += fs.readFileSync(LAYOUT_STYLES_PATH());
    return layoutCss;
};


// render any possible scss into css
let renderScss = function (scss) {
    console.log('rendering any scss into css');
    return sass.renderSync({data: scss});
};


// get copied layout template
let getLayoutCopyData = function () {
    console.log('getting layout template data');
    return fs.readFileSync(path.join(BUILD_DIR, 'layout.html'), 'utf8');
};


// concatenate the individual template files to the the layout template file
let joinTemplatesAndLayout = function (copiedTemplateFiles, layoutData) {
    copiedTemplateFiles.forEach(file => {
        let template = fs.readFileSync(path.join(BUILD_DIR, file), 'utf8');
        let newContent = layoutData.replace('{content}', template);
        fs.writeFileSync(path.join(BUILD_DIR, file), newContent);
    });
};


// parse any specific '<style></style>' in the templates and concatenate the css to the existing css
// then convert the template to inline styling
// finally, write to file
let generateNewTemplates = function (copiedTemplateFiles, layoutCss) {
    console.log("generating new template files");
    copiedTemplateFiles.forEach(function (file) {
        let template = fs.readFileSync(path.join(BUILD_DIR, file), 'utf8');

        let $ = cheerio.load(utils.wrapEexTagsinHtmlComments(template), {xmlMode: true});
        let templateStyling = $('style').contents().toArray().reduce(function (prev, curr) {
            return prev + curr.data;
        }, '');
        $('style').remove();

        template = $.html();
        let templateCss = layoutCss + templateStyling;

        let juicedTemplate = juice.inlineContent(template, templateCss, JUICE_OPTIONS);
        fs.writeFileSync(
            path.join(BUILD_DIR, file.replace('.html', '.html.eex')),
            utils.unwrapEexTagsinHtmlComments(juicedTemplate)
        );
        console.log('Created ' + file.replace('.html', '.html.eex'));
    });
};

// generate text files and write to file
let generateTextFiles = function (copiedTemplateFiles) {
    console.log("generating new text files");
    copiedTemplateFiles.forEach(function (file) {
        let completeTemplate = fs.readFileSync(path.join(BUILD_DIR, file), {encoding: 'utf-8'});
        let textTemplate = htmlToText.fromString(
            utils.replaceEexTagswithBrackets(completeTemplate),
            {
                uppercaseHeadings: false
            }
        );
        textTemplate = utils.replaceBracketsWithEexTags(textTemplate);
        fs.writeFileSync(
            path.join(BUILD_DIR, file.replace('.html', '.txt.eex')),
            textTemplate
        );
        console.log('Created ' + file.replace('.html', '.txt.eex'))
    });

};


// remove the parsed files (leaving only .html.eex and .txt.eex files)
let deleteRemainingCopiedFiles = function () {
    console.log("deleting copied '.html' indermediary templates");
    let deleted = del.sync([`${BUILD_DIR}/*.html`], {dryRun: false});
    console.log("deleted: " + deleted);
};


// steps to be run without foundation
let run = function () {
    createTemplateCopies(getTemplates());
    createLayoutCopy();
    let templates = getCopiedTemplates();
    let layoutCss = renderScss(getLayoutCss());
    if (ENV_OPTIONS.USE_LAYOUT == true) {
        joinTemplatesAndLayout(templates, getLayoutCopyData());
    }
    generateNewTemplates(templates, layoutCss);
    generateTextFiles(templates);
    deleteRemainingCopiedFiles()
};


// inky parsing step if using foundation
if (ENV_OPTIONS.USE_FOUNDATION == true) {
    createTemplateCopies(getTemplates());
    createLayoutCopy();
    let templates = getCopiedTemplates();
    let layoutCss = renderScss(getLayoutCss());
    if (ENV_OPTIONS.USE_LAYOUT == true) {
        joinTemplatesAndLayout(templates, getLayoutCopyData());
    }
    console.log("parsing inky template files using foundation tool inky");
    inky({
        src: `${BUILD_DIR}/*.html`,
        dest: BUILD_DIR
    }, function () {
        generateNewTemplates(templates, layoutCss);
        generateTextFiles(templates);
        deleteRemainingCopiedFiles()
    });
} else {
    // run without foundation
    run();
}


console.log('Done');