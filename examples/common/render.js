const fs = require('fs');
const path = require('path');
const frontmatter = require('front-matter');
const marked = require('marked');

async function render(name) {
    // Resolve the path to the possible markdown file
    const fullPathToPossibleMarkdownFile = path.resolve(
        __dirname,
        `./pages/${name}${name.endsWith('.md') ? '' : '.md'}`,
    );
    // Attempt to read the file, returning false ("no I did not handle this request") if any error occurs reading the file.
    let markdownFileContents = null;
    try {
        markdownFileContents = await fs.promises.readFile(fullPathToPossibleMarkdownFile, { encoding: 'utf8' });
    } catch (ignored) {
        return false;
    }
    // Parse the file first using `front-matter` and `marked`
    const fileFrontmatter = frontmatter(markdownFileContents);
    const htmlFileContents = marked(fileFrontmatter.body);
    // Generate the HTML, using the frontmatter to generate the title.
    return `<html lang="en"><head><title>${fileFrontmatter.attributes.title || ''}</title>`
        + `</head><body>\n${htmlFileContents}</body></html>`;
}

/**
 * @returns {Promise<[string, string][]>}
 */
async function renderAllPages() {
    const fullPathToPages = path.resolve(
        __dirname,
        `./pages`,
    );
    const filesInPagesDir = await fs.promises.readdir(fullPathToPages, { encoding: 'utf8', withFileTypes: true });
    return Promise.all(
        filesInPagesDir
            .reduce((entries, dirEnt) => {
                if (dirEnt.isFile() && dirEnt.name.endsWith('.md')) {
                    entries.push(
                        render(dirEnt.name)
                            .then((html) => [
                                dirEnt.name.replace(/\.md$/i, '.html'),
                                html,
                            ])
                    );
                }
                return entries;
            }, []),
    );
}

module.exports = { render, renderAllPages };
