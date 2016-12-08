const css = require('css');
const R = require('ramda');
const fs = require('fs');
const path = require('path');

let fileIn,
    fileOut;

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

let readFile = () => {
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

let parse = (data) => {
    // parse css data and create ast tree
    return new Promise((fulfill, reject) => {
        try {
            let parsedData = css.parse(data.toString(), { silent: false });
            fulfill(parsedData);
        } catch (err) {
            reject(err);
        }
    });
};

let validate = (data) => {
    // validation ast tree
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

let processAST = (data) => {
    // process ast tree and transform it to a new structure new suitable for keyframeSet 
    return new Promise((fulfill, reject) => {
        try {
            // original version with no ramda visible at http://codepen.io/gibbok/pen/PbRrxp
            let processKeyframe = (vals, declarations) => [
                // map each value
                R.map(R.cond([
                    [R.equals('from'), R.always(0)],
                    [R.equals('to'), R.always(100)],
                    [R.T, parseFloat]
                ]), vals),
                // collect all property value pairs and merge in one object
                R.reduce(R.merge, {},
                    R.map(R.converge(R.objOf, [
                        R.prop('property'),
                        R.prop('value')
                    ]), declarations))
            ];

            let processAnimation = (offsets, transf) =>
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
                ]));
            let result = transformAST(data)
            fulfill(result);
        } catch (err) {
            reject(err);
        }
    });
};

let writeFile = (data) => {
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

let init = () => {
    prerequisiteCheck().then(() => {
        return getNodeArguments();
    }).then(() => {
        return readFile();
    }).then((data) => {
        return parse(data);
    }).then((data) => {
        return validate(data);
    }).then((data) => {
        return processAST(data);
    }).then((data) => {
        return writeFile(data);
    }).then((data) => {
        console.log('success: file created at: ' + fileOut);
    }).catch(function (err) {
        console.log('error: ' + err);
    });
};

init();