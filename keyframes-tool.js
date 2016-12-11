/*! Keyframes-Tool | The MIT License (MIT) | Copyright (c) 2016 GibboK */

const css = require('css');
const R = require('ramda');
const fs = require('fs');
const path = require('path');

let fileIn,
    fileOut;

/**
 * Check software requirements.
 */
let prerequisiteCheck = () => {
    return new Promise((fulfill, reject) => {
        try {
            // check node version
            let getNodeVersion = (strVersion) => {
                let numberPattern = /\d+/g;
                return numVersion = Number(strVersion.match(numberPattern).join(''))
            },
                requiredVersion = getNodeVersion('v6.9.1'),
                currentVersion = getNodeVersion(process.version);
            if (currentVersion >= requiredVersion) {
                fulfill();
            } else {
                throw ('you current version of node.js is not supported, please update to the latest version of node.js');
            }
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Get arguments passed Node.js using terminal.
 */
let getNodeArguments = () => {
    return new Promise((fulfill, reject) => {
        try {
            // check paths in arguments
            let hasFileInOutArgs = process.argv.length === 4;
            if (!hasFileInOutArgs) {
                throw ('arguments for file-in and file-out must be provided');
            }
            // normalize paths
            fileIn = path.resolve(path.normalize(__dirname + process.argv[2])).toString();
            fileOut = path.resolve(path.normalize(__dirname + process.argv[3])).toString();

            // check paths for extensions
            let isFileInCss = fileIn.endsWith('.css'),
                isFileOutJson = fileOut.endsWith('.json');
            if (!isFileInCss) {
                throw ('argument file-in must have extension .css');
            }
            if (!isFileOutJson) {
                throw ('argument file-out must have extension .json');
            }
            fulfill();
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Read CSS input file.
 */
let readInputFile = () => {
    // read css file
    return new Promise((fulfill, reject) => {
        fs.readFile(fileIn, (err, data) => {
            if (err) {
                reject(err);
            } else {
                fulfill(data);
            }
        });
    });
}

/**
 * Parse content of CSS input file and creates and AST tree.
 */
let parse = (data) => {
    return new Promise((fulfill, reject) => {
        try {
            let parsedData = css.parse(data.toString(), { silent: false });
            fulfill(parsedData);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Validate AST tree content.
 */
let validate = (data) => {
    return new Promise((fulfill, reject) => {
        try {
            let isStylesheet = data.type === 'stylesheet',
                hasNoParsingErrors = 'stylesheet' in data && data.stylesheet.parsingErrors.length === 0,
                hasKeyframes = R.any((rule) => rule.type === 'keyframes', data.stylesheet.rules);
            if (!isStylesheet || !hasNoParsingErrors || !hasKeyframes) {
                if (!isStylesheet) {
                    throw 'ast is not of type stylesheet';
                }
                if (!hasNoParsingErrors) {
                    R.map(err => console.log(new Error(`error: ${err}`)), data.stylesheet.parsingErrors);
                    throw 'file has parse error';
                }
                if (!hasKeyframes) {
                    throw 'no keyframes rules found';
                }
            }
            fulfill(data);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Process AST tree content and a new data structure valid for Web Animation API KeyframeEffect.
 * The following code uses Ramda.js for traversing a complex AST tree,
 * an alternative version is visible at http://codepen.io/gibbok/pen/PbRrxp
 */
let processAST = (data) => {
    return new Promise((fulfill, reject) => {
        try {
            let processKeyframe = (vals, declarations) => [
                // map each value covnerting offset to decimal point
                R.map(R.cond([
                    [R.equals('from'), R.always(0)],
                    [R.equals('to'), R.always(1)],
                    [R.T, value => parseFloat(value) / 100]
                ]), vals),
                // collect all property value pairs and merge in one object
                R.reduce(R.merge, {},
                    R.map(R.converge(R.objOf, [
                        R.prop('property'),
                        R.prop('value')
                    ]), declarations))
            ];

            let processAnimation = (offsets, transf) =>
                // process offset property
                R.map(R.pipe(
                    R.objOf('offset'),
                    R.merge(transf)), offsets);

            let getContentOfKeyframes = R.map(R.pipe(
                // process keyframes
                R.converge(processKeyframe, [
                    R.prop('values'),
                    R.prop('declarations')
                ]),
                // process animations
                R.converge(processAnimation, [
                    R.nth(0),
                    R.nth(1)
                ])));

            let transformAST = R.pipe(
                // get `stylesheet.rules` property
                R.path(['stylesheet', 'rules']),
                // get only object whose `type` property is `keyframes`
                R.filter(R.propEq('type', 'keyframes')),
                // map each item in `keyframes` collection
                // to an object {name: keyframe.name, content: [contentOfkeyframes] }
                R.map((keyframe) => ({
                    name: keyframe.name,
                    content: getContentOfKeyframes(keyframe.keyframes)
                })),
                // make a new object using animation `name` as keys
                // and using a flatten content as values
                R.converge(R.zipObj, [
                    R.map(R.prop('name')),
                    R.map(R.pipe(R.prop('content'), R.flatten))
                ]),
                // order by property `offset` ascending
                R.map(R.pipe(R.sortBy(R.prop('offset'))))
            );
            let result = transformAST(data);
            fulfill(result);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Write JSON output file.
 */
let writeOutputFile = (data) => {
    return new Promise((fulfill, reject) => {
        data = JSON.stringify(data);
        fs.writeFile(fileOut, data, (err) => {
            if (err) {
                reject(err);
            } else {
                fulfill(data);
            }
        });
    });
};

/**
 * Initiate conversion process.
 */
let init = () => {
    prerequisiteCheck().then(() => {
        return getNodeArguments();
    }).then(() => {
        return readInputFile();
    }).then((data) => {
        return parse(data);
    }).then((data) => {
        return validate(data);
    }).then((data) => {
        return processAST(data);
    }).then((data) => {
        return writeOutputFile(data);
    }).then((data) => {
        console.log('success: file created at: ' + fileOut);
    }).catch(function(err) {
        console.log('error: ' + err);
    });
};

init();