// To execute this script in debug (local) mode run command: 'npm install node-fetch' and then 'node ./.github/scripts/check_links.mjs'
import { execSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

const INCOMING_BRANCH_NAME = process.env.git_head_ref;

// If there is an incoming branch (this is run within a PR) use it, otherwise default to main-tutorial
const TUTORIAL_BRANCH_TO_TEST = INCOMING_BRANCH_NAME || 'main-tutorial';

const GIT_ORIGIN = 'origin/';
const TUTORIAL_BRANCH_GIT_NAME = GIT_ORIGIN + TUTORIAL_BRANCH_TO_TEST;
const TUTORIALS_FOLDER = 'Tutorials/'

const URLS_TO_IGNORE = [];
const FILES_TO_IGNORE = [];

const ALLOWED_BRANCHES = ['main', 'main-multi-tenant', 'main-multi-tenant-features']

// Regular expression pattern for matching markdown links
// \[    - Match the literal opening square bracket "["
// .*    - Match any character zero or more times
// \]    - Match the literal closing square bracket "]"
// \(    - Match the literal opening parenthesis "("
// (.*?) - Capture group: Match any character zero or more times, but as few times as possible
// \)    - Match the literal closing parenthesis ")"
// g     - Global flag to search for all occurrences in the input string
const MARKDOWN_LINK_PATTERN = /\[.*\]\((.*?)\)/g;

// Regular expression pattern for matching the HTML img tag and capture the URL in the src attribute
// <img\s+    - Match the literal '<img' followed by one or more whitespaces
// src="      - Match the literal 'src="'
// ([^"]+)    - Capture group: Match any character that is not " one or more times
// "          - Match the symbol "
// .*         - Match any character zero or many times
// >          - match the symbol >
const HTML_IMAGE_TAG_LINK_PATTERN = /<img\s+src="([^"]+)".*>/g;

const LINK_PATTERNS = [MARKDOWN_LINK_PATTERN, HTML_IMAGE_TAG_LINK_PATTERN];

// Regular expression pattern for markdown section headers 
// ^        - Assert the position at the start of a line
// #{1,6}   - Match 1-6 times the # symbol 
// \s+      - Match any whitespace character one or more times
// (.+)     - Capture group: Match any character one or more times
const SECTION_HEADER_PATTERN = /^#{1,6}\s+(.+)/;

let urlsList = [];
let repoFilesList = [];
let successfulChecks = [];
let failedChecks = [];

/**
* Recursively searches for markdown files within a given directory and returns a list with the paths to the files
*/
function findMarkdownFiles(directory, fileList = []) {
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
        const filePath = path.join(directory, file);
        if (fs.statSync(filePath).isDirectory() && !filePath.includes('node_modules')) {
            fileList = findMarkdownFiles(filePath, fileList);
        } else {
            if (path.extname(file) === '.md') {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

/**
* Extracts all the links found in a list of mardown file paths 
* Example for a link in markdown [example text](http://example.com)
*/
function extractLinks(markdownFilesList) {
    let foundURLs = [];
    markdownFilesList.forEach((markdownFile) => {

        if (FILES_TO_IGNORE.includes(markdownFile)) {
            console.log(`Ignoring file: ${markdownFile}`);
            return;
        }

        console.log(`Processing file: ${markdownFile}`);

        const markdownLines = fs.readFileSync(markdownFile).toString().split('\n');

        let lineCounter = 1;
        markdownLines.forEach(line => {
            LINK_PATTERNS.forEach(pattern => {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const foundLink = match[1];

                    // Separate all links to a file found in the repository (relative paths) to a different list
                    if (foundLink.startsWith('https://')) {
                        foundURLs.push({ 'File': markdownFile, 'Line': lineCounter, 'URL': foundLink });
                    } else {
                        try {
                            repoFilesList.push({ 'File': markdownFile, 'Line': lineCounter, 'Path': getGitPathForFile(markdownFile, foundLink) });
                        } catch (error) {
                            error['Line'] = lineCounter;
                            failedChecks.push({ 'State': '[ERROR]', 'File': markdownFile, 'Line': lineCounter, 'Details': error.message });
                        }
                    }
                }
            });
            lineCounter++;
        });
    });
    return foundURLs;
}

/**
* Get the Git path (origin/<branch>:<file>) for a link taking into consideration the containing markdown file name
* an Exception is thrown if either the link could not be correctly processed or is found in a branch that is not allowed
*/
function getGitPathForFile(markdownFile, link) {
    const readMe = 'README.md';
    const filePathFolderDepth = calculateFolderDepth(markdownFile);
    const pathToOtherBranchRegex = calculateRegexPathToOtherBranch(filePathFolderDepth);
    const pathToOtherBranchPrefixLen = calculatePathPrefixLengthToOtherBranch(filePathFolderDepth);

    // Handle a link to another branch and check that the branch is allowed
    // Ex: "../../tree/main-tutorial/01-BillOfMaterials.md" turns into "origin/main-tutorial:01-BillOfMaterials.md"
    if (pathToOtherBranchRegex.test(link)) {
        const { branch, file } = getBranchAndFileForLink(link, pathToOtherBranchPrefixLen);
        if (ALLOWED_BRANCHES.includes(branch)) {
            return file === '' ? GIT_ORIGIN + branch : GIT_ORIGIN + branch + ':' + file;
        }
        else {
            throw new Error(`Branch: ${branch} not allowed`)
        }
    }

    // Handle files found directly in the root of the directory
    if (filePathFolderDepth === 0) {
        // Handle a link to a file within tutorials folder
        // Ex: "./Tutorials/01-BillOfMaterials.md" turns into "origin/main-tutorial:Tutorials/01-BillOfMaterials.md"
        if (link.startsWith('./Tutorials')) {
            return TUTORIAL_BRANCH_GIT_NAME + ':' + link.replace('./', '');
        }

        // No folders are present in the link, so search for the file within the same folder
        // Ex: "README.md" turns into "origin/main-tutorial:README.md"
        if (calculateFolderDepth(link) === 0) {
            return TUTORIAL_BRANCH_GIT_NAME + ':' + link;
        }
    }
    // Handle files found in the tutorials folder but not a folder within this folder
    else if (markdownFile.startsWith(TUTORIALS_FOLDER) && filePathFolderDepth === 1) {
        // Handle a link within the same folder
        // Ex: "./01-BillOfMaterials.md" turns into "origin/main-tutorial:Tutorials/01-BillOfMaterials.md" 
        if (link.startsWith('./')) {
            return TUTORIAL_BRANCH_GIT_NAME + ':' + TUTORIALS_FOLDER + link.substring(2);
        }

        // Search for the README file in the folder one level above
        // Ex: "../README.md" turns into "origin/main-tutorial:README.md"
        if (link === '../README.md') {
            return TUTORIAL_BRANCH_GIT_NAME + ':' + readMe;
        }

        // Handle a link to main
        // Ex: "../../../" turns into "origin/main"
        if (link === '../../../') {
            return GIT_ORIGIN + 'main';
        }

        // No folders are present in the path, so search for the link within the same folder
        if (calculateFolderDepth(link) === 0) {
            return TUTORIAL_BRANCH_GIT_NAME + ':' + TUTORIALS_FOLDER + link;
        }
    }

    throw new Error('Link pattern not matched')
}

/**
* Calculate the depth from a path (Amount of folders present)
* Ex: 'ThisFolder/OtherFolder/file.txt' depth = 2
*/
function calculateFolderDepth(path) {
    return path.split('/').length - 1;
}

/**
* Calculate the length of the prefix from a branch to another branch
* Ex: currentFileFolderDepth = 1 ->  prefixLength = 14
*/
function calculatePathPrefixLengthToOtherBranch(currentFileFolderDepth) {
    // Both ../../tree and ../../blob have 11 chars. Add three more (../) for each folder depth
    return 11 + (3 * currentFileFolderDepth);
}

/**
* Calculate the regex pattern for a path to another branch based on the current file path depth
* Ex: currentFileFolderDepth = 1 -> result = ../../../tree or ../../../blob
*/
function calculateRegexPathToOtherBranch(currentFileFolderDepth) {
    // At least two '../' are needed, add one more for each folder depth
    const amountOfFolderUpsNeeded = 2 + currentFileFolderDepth;

    // Regular expression pattern links to other branch from root folder 
    // ^                - Assert the position at the start of a line
    // (\\.\\./){n}     - Match n times the '../' pattern (n = amountOfFolderUpsNeeded)
    // (tree|blob)      - Match once either tree or blob word
    // \/               - Match the symbol '/'
    // .*               - Match any character zero or more times
    return new RegExp('^(\\.\\.\/){' + amountOfFolderUpsNeeded + '}(tree|blob)\/.*');
}

/**
* Returns the branch and the file (if present), based on the prefix length of the path
*/
function getBranchAndFileForLink(link, prefixLength) {
    let file = '';
    let branch = link.substring(prefixLength);

    // Handle the case, where a specific file within a specific branch is referenced
    if (branch.lastIndexOf('/') !== -1) {
        file = branch.substring(branch.indexOf('/') + 1);
        branch = branch.substring(0, branch.indexOf('/'));
    }

    return { branch, file };
}

/**
* Test the response code of a list of absolute URLs, ignore URLs from list 'urlsToIgnore'
*/
async function testURLsResponse(urlList) {
    const requestPromises = urlList.map(urlObject => {
        if (URLS_TO_IGNORE.includes(urlObject.URL)) {
            console.log(`Ignoring URL: ${urlObject.URL} in File: ${urlObject.File}, line ${urlObject.Line}`);
            return Promise.resolve();
        }

        return sendRequest(urlObject)

    });
    await Promise.all(requestPromises);
}

/**
* Send an HTTP request to a url and check response code between 200 and 300 (ok)
*/
async function sendRequest(urlObject) {
    try {
        const response = await fetch(urlObject.URL);

        const httpStatusCode = response.status;

        if (httpStatusCode >= 200 && httpStatusCode < 300) {
            successfulChecks.push({ 'State': '[SUCCESS]', 'File': urlObject.File, 'Line': urlObject.Line, 'URL': urlObject.URL, 'ResponseCode': httpStatusCode });
        } else {
            failedChecks.push({ 'State': '[ERROR]', 'File': urlObject.File, 'Line': urlObject.Line, 'URL': urlObject.URL, 'ResponseCode': httpStatusCode });
        }
    } catch (error) {
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request was aborted';
        }
        failedChecks.push({ 'State': '[ERROR]', 'File': urlObject.File, 'Line': urlObject.Line, 'URL': urlObject.URL, 'Error': errorMessage });
    }
}

/**
* Use the git command to check if a file is present within the repository (git cat-file -e)
*/
function testGitFilesExistence(gitFilePaths) {
    gitFilePaths.forEach((gitFilePath) => {
        // Separate files with section anchors (https:example.com/example.md#title) into two, link to the file and the section anchor
        const anchorIndex = gitFilePath.Path.lastIndexOf('#');
        let anchor = '';
        if (anchorIndex !== -1) {
            anchor = gitFilePath.Path.substring(anchorIndex);
            gitFilePath.Path = gitFilePath.Path.substring(0, anchorIndex);
        }

        // With a gitFilePath.Path like <branch>:<file>
        // git cat-file -e is a command that responds with an error if the <file> is not present in the <branch>, otherwise no other response is expected
        // it is possible to test file existence for files within other than the currently checked out branch
        try {
            execSync(`git cat-file -e ${gitFilePath.Path}`);
            // Check if after ensuring the file exists, the section anchor point to an existing title within the file
            if (anchor !== '') {
                checkAnchorPresentInFile(gitFilePath, anchor)
            }
            else {
                successfulChecks.push({ 'State': '[SUCCESS]', 'File': gitFilePath.File, 'Line': gitFilePath.Line, 'GitPath': gitFilePath.Path });
            }
        } catch (error) {
            failedChecks.push({ 'State': '[ERROR]', 'File': gitFilePath.File, 'Line': gitFilePath.Line, 'GitPath': gitFilePath.Path, 'Details': 'File not found with git cat-file -e' });
        }
    });
}

/**
* Check within a file with section anchors for a matching section title
*/
function checkAnchorPresentInFile(gitFilePath, anchor) {
    const fileHeaders = [];

    try {
        // Get the content of the file with git
        const content = execSync(`git show ${gitFilePath.Path}`).toString();
        const contentLines = content.split('\n');

        // Create a list with all the transformed section headers within the file
        // The transformation is done according to the GitHub documentation (https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links)
        contentLines.forEach((line) => {
            if (SECTION_HEADER_PATTERN.test(line)) {
                const match = line.match(SECTION_HEADER_PATTERN);
                let header = match[1];

                // Letters are converted to lower-case.
                header = header.toLowerCase();
                // Leading and trailing spaces are trimmed, then remaining spaces are replaced by hyphens (-). 
                header = header.trim().replaceAll(' ', '-');
                // Any other punctuation character is removed.
                header = header.replace(/[^\w\s-]/g, '');

                fileHeaders.push(header);
            }
        });

        if (fileHeaders.includes(anchor.substring(1))) {
            successfulChecks.push({ 'State': '[SUCCESS]', 'File': gitFilePath.File, 'Line': gitFilePath.Line, 'GitPath': gitFilePath.Path });
        }
        else {
            failedChecks.push({ 'State': '[ERROR]', 'File': gitFilePath.File, 'Line': gitFilePath.Line, 'GitPath': gitFilePath.Path + anchor, 'Details': 'Anchor not found in file' });
        }
    } catch (error) {
        failedChecks.push({ 'State': '[ERROR]', 'File': gitFilePath.File, 'Line': gitFilePath.Line, 'GitPath': gitFilePath.Path + anchor });
    }
}

/**
* Print a list of results (both succesfull as failed)
*/
function printChecksResults(checks) {
    // Sort requests by file name ASC and then by line number ASC
    checks.sort((a, b) => {
        if (a.File === b.File) {
            return a.Line - b.Line;
        }
        return a.File < b.File ? -1 : 1;
    });

    checks.forEach((check) => {
        // Using destructuring with default values to handle missing properties
        const {
            State = 'Unknown State',
            File = 'Unknown File',
            Line = 'Unknown Line',
            URL,
            GitPath,
            ResponseCode,
            Error,
            Details
        } = check;

        // Construct the check string using template literals and conditional appending
        let checkString = `State: ${State}, File: ${File}, Line: ${Line}`;
        if (URL) checkString += ` - URL: ${URL}`;
        if (GitPath) checkString += ` - Git Path: ${GitPath}`;
        if (ResponseCode) checkString += ` - HTTP Response Code: ${ResponseCode}`;
        if (Error) checkString += ` - Error: ${Error}`;
        if (Details) checkString += ` - Details: ${Details}`;

        console.log(checkString);
    });
}

/**
* Generate a summary of the run
*/
function printSummary(markdownFilesList) {
    console.log(`Total files scanned: ${markdownFilesList.length}`);
    console.log(`\tFiles skipped: ${FILES_TO_IGNORE.length}`);

    console.log('\nTotal links found:', urlsList.length + repoFilesList.length);
    console.log(`\tExternal URLs: ${urlsList.length}`);
    console.log(`\t  Skipped external URLs: ${URLS_TO_IGNORE.length}`);

    console.log(`\tInternal links (repository files): ${repoFilesList.length}`);

    console.log(`\nSuccessful checks: ${successfulChecks.length}`);
    console.log(`Failed checks: ${failedChecks.length}`);
}

async function main() {
    console.log("Markdown extraction from files in repository");
    const markdownFilesList = findMarkdownFiles('./');

    console.log("::group::URL extraction from markdowns");
    urlsList = extractLinks(markdownFilesList);
    console.log("::endgroup::");

    console.log("Checking URLs for HTTP response status...");
    await testURLsResponse(urlsList);

    console.log("Checking repository files existence...");
    testGitFilesExistence(repoFilesList);

    console.log("Checks finished");

    console.log("\nSummary:");
    printSummary(markdownFilesList);

    console.log("\n::group::Successful Checks:");
    printChecksResults(successfulChecks);
    console.log("::endgroup::");

    if (failedChecks.length > 0) {
        console.log("::group::Failed Checks:");
        printChecksResults(failedChecks);
        console.log("::endgroup::");

        // Temporarily ignore failed checks for links with response 403: https://jira.tools.sap/browse/ERPCDXCNS-4212
        if (failedChecks.every(check => check.ResponseCode === 403)) {
            process.exit(0);
        }
        process.exit(1);
    }

    process.exit(0);
}

main();
