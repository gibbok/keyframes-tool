const css = require('css');
const R = require('ramda');
const fs = require('fs');

let readFile = (fileName) => {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            console.warn(`error: ${err.message}`);
            return;
        }
        logic(data);
    });
};

let writeFile = (fileName, data) => {
    fs.writeFile(fileName, JSON.stringify(data), function (err) {
        if (err) {
            console.warn(`error: ${err.message}`);
            return;
        }
        console.log(JSON.stringify(data));
    });
};

let logic = data => {
    try {
        let parsedData = parse(data),
            isValid = validate(parsedData);
        if (isValid) {
            process(parsedData);
        }
    } catch (err) {
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
            console.warn(new Error('error: ast is not of type stylesheet'));
        }
        if (!hasNoParsingErrors) {
            R.map(err => console.warn(new Error(`error: ${err}`)), data.stylesheet.parsingErrors);
        }
        if (!hasKeyframes) {
            console.warn(new Error('error: no keyframes rules found'));
        }
        return false;
    }
    return true;
};

let process = function (data) {
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
    writeFile(__dirname + '/test.json', result);
};


readFile(__dirname + '/test.css');

    //let result = css.stringify(obj);
    //console.log(JSON.stringify(result));