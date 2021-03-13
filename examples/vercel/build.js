const fs = require('fs');
const path = require('path');
const { renderAllPages } = require('../common/render'); // eslint-disable-line node/no-unpublished-require

renderAllPages()
    .then((pages) => Promise.all(pages.map(async ([fileName, html]) => {
        const finalFileName = fileName === 'home.html' ? 'index.html' : fileName;
        const publicPathForFile = path.resolve(__dirname, './public', finalFileName);
        console.log(`Writing ${finalFileName} to ${publicPathForFile}`);
        await fs.promises.writeFile(publicPathForFile, html);
    })));
