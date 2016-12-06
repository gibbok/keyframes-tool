const css = require('css');
const R = require('ramda');
const fs = require('fs');

let fileIn,
    fileOut;

let readFile = () => {
    fs.readFile(fileIn, function (err, data) {
        if (err) {
            throw err.message;
        }
        logic(data);
    });
};

let writeFile = (data) => {
    fs.writeFile(fileOut, JSON.stringify(data), function (err) {
        if (err) {
            throw err.message;
        }
        console.log(JSON.stringify(data));
    });
};

let logic = data => {
    try {
        let parsedData = parse(data),
            isValid = validate(parsedData);
        if (isValid) {
            processAST(parsedData);
        }
    } catch (err) {
        debugger
        console.warn('error: issue with parsing');
        return false;
    }
};

let parse = data => {
    return css.parse(data.toString(), { silent: false });
};

let validate = data => {
    let isStylesheet = data.type === 'stylesheet',
        hasNoParsingErrors = 'stylesheet' in data && data.stylesheet.parsingErrors.length === 0,
        hasKeyframes = R.any((rule) => rule.type === 'keyframes', data.stylesheet.rules);
    if (!isStylesheet || !hasNoParsingErrors || !hasKeyframes) {
        if (!isStylesheet) {
            //console.warn(new Error('error: ast is not of type stylesheet'));
            throw 'error: ast is not of type stylesheet';
        }
        if (!hasNoParsingErrors) {
            R.map(err => console.warn(new Error(`error: ${err}`)), data.stylesheet.parsingErrors);
            throw 'error: file has parse error';
        }
        if (!hasKeyframes) {
            //console.warn(new Error('error: no keyframes rules found'));
            throw 'error: no keyframes rules found';
        }
        return false;
    }
    return true;
};

let processAST = (data) => {
    // original version with no ramda visible at http://codepen.io/gibbok/pen/PbRrxp
    let processKeyframe = (vals, declarations) => [
        R.map(R.cond([
            [R.equals('from'), R.always(0)],
            [R.equals('to'), R.always(100)],
            [R.T, parseFloat]
        ]), vals),
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
        R.converge(processKeyframe, [
            R.prop('values'),
            R.prop('declarations')
        ]),
        R.converge(processAnimation, [
            R.nth(0),
            R.nth(1)
        ])));

    let transformAST = R.pipe(
        R.path(['stylesheet', 'rules']),
        R.filter(R.propEq('type', 'keyframes')),
        R.map((keyframe) => ({
            name: keyframe.name,
            content: getContentOfKeyframes(keyframe.keyframes)
        })),
        R.converge(R.zipObj, [
            R.map(R.prop('name')),
            R.map(R.pipe(R.prop('content'), R.flatten))
        ]));
    let result = transformAST(data)
    writeFile(result);
};

let getNodeArguments = () => {
    let hasFileInOutArgs = process.argv.length === 4,
        isCssExt = false,
        isJsonExt = false,
        argFileIn = '',
        argFileOut = '';
    if (!hasFileInOutArgs) {
        throw ('arguments for file-in and file-out must be provided');
    }   
    argFileIn = __dirname + process.argv[2];
    argFileOut =__dirname + process.argv[3];
    if (!argFileIn.endsWith('.css')) {
       throw ('argument file-in must have extension .css');
    }
    if (!argFileOut.endsWith('.json')) {
       throw ('argument file-out must have extension .json');
    }
    // var [,, argFileIn, argFileOut] = process.argv; // destructuring assignment
    fileIn = argFileIn;
    fileOut = argFileOut;
};

let init = () => {
    try {
        getNodeArguments();
        readFile();
    } catch (err) {
        console.warn(`error: ${err}`);
    }
};

init();

// readFile(__dirname + '/test.css');

/*

node index test.css test.json

node --debug index.js /test.css / test.json
node --debug-brk index.js /test.css / test.json
 */