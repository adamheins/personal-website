'use strict';

let yaml = require('js-yaml');
let glob = require('glob');
let fs = require('fs');
let path = require('path');
let moment = require('moment');
let pug = require('pug');
let mkdirp = require('mkdirp');

let md = require('./md');


const PRETTY_DATE_FORMAT = 'MMMM D, YYYY';
const REQUIRED_FIELDS = ['title', 'date', 'link', 'flavour', 'description',
                         'file', 'scripts', 'styles'];
const STATIC_HOST = 'https://static.adamheins.com';

const TEMPLATE_PATH = 'templates';
const ARTICLES_PATH = 'articles';
const PUBLIC_PATH = 'public';

const ARTICLES_GLOB = ARTICLES_PATH + '/**/*.yaml';
const TEMPLATE_GLOB = TEMPLATE_PATH + '/**/*.pug'
const TEMPLATE_IGNORE = ['**/mixins/*', '**/includes/*'];


let articles = [];


// Checks the article data to ensure all required fields exist.
function validateArticleData(file, data) {
    let keys = Object.keys(data);
    let fileName = path.basename(file);

    let valid = true;
    REQUIRED_FIELDS.forEach(field => {
        if (keys.indexOf(field) < 0) {
            console.log(fileName + ' missing field: ' + field);
            valid = false;
        }
    });
    return valid;
}

function templateToPublic(file, pugOptions) {
    // Create web directory structure.
    let htmlFile = file.replace(TEMPLATE_PATH, PUBLIC_PATH)
                       .replace('.pug', '.html');
    let htmlDir = path.dirname(htmlFile)
    mkdirp.sync(htmlDir);

    // Parse pug file.
    let html = pug.renderFile(file, pugOptions);
    fs.writeFileSync(htmlFile, html);
}


// TODO sync glob
glob(ARTICLES_GLOB, (err, files) => {
    if (err) {
        console.log(err);
        return 1;
    }

    files.forEach(file => {
        let data = yaml.safeLoad(fs.readFileSync(file, 'utf8'));
        let valid = validateArticleData(file, data);

        if (!valid) {
            process.exit(1);
        }

        // Parse body markdown file.
        let dirname = path.dirname(file);
        let bodyFile = path.join(dirname, data['file']);
        let html = md.markdown(fs.readFileSync(bodyFile, 'utf8'));
        data['html'] = html;

        // Format date.
        data['date'] = moment(data['date']);
        data['prettyDate'] = data['date'].local().format(PRETTY_DATE_FORMAT);

        articles.push(data);
    });

    // Sort articles by date in descending order.
    articles.sort((a, b) => {
        return a.date.isBefore(b.date);
    });

    let pugOptions = {
        articles: articles,
        articles3: articles.slice(0, 3),
        basedir: TEMPLATE_PATH,
        moment: moment,
        staticHost: STATIC_HOST
    };

    glob.glob(TEMPLATE_GLOB, { ignore: TEMPLATE_IGNORE }, (err, files) => {
        if (err) {
            console.log(err);
            return 1;
        }

        files.forEach(file => {
            // Create web directory structure.
            let htmlFile = file.replace(TEMPLATE_PATH, PUBLIC_PATH)
                               .replace('.pug', '.html');
            let htmlDir = path.dirname(htmlFile)
            mkdirp.sync(htmlDir);

            // Parse pug file.
            let html = pug.renderFile(file, pugOptions);
            fs.writeFileSync(htmlFile, html);
        });
    });

    // TODO write article html files
});
