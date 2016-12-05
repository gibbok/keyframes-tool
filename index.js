const css = require('css');
const R = require('ramda');
const fs = require('fs');

fs.readFile(__dirname + '/test.css', function (err, data) {
    if (err) {
        console.warn(`error: ${err.message}`);
        return;
    }
    logic(data);
});

let logic = data => {
    try {
        var parsedData = parse(data);
    } catch (err) {
        console.warn('error: issue with parsing');
        return false;
    }
    var isValid = validate(parsedData);
    if (isValid) {
        process(parsedData);
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
            console.warn('error: ast is not of type stylesheet');
        }
        if (!hasNoParsingErrors) {
            R.map(e => console.warn(e), data.stylesheet.parsingErrors);
        }
        if (!hasKeyframes) {
            console.warn('error: no keyframes rules found');
        }
        return false;
    }
    return true;
};

let process = function (data) {
    var processKeyframe = (vals, declarations) => [
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
    ]

    var processAnimation = (offsets, transf) =>
        R.map(R.pipe(
            R.objOf('offset'),
            R.merge(transf)), offsets)

    var getContentOfKeyframes = R.map(R.pipe(
        R.converge(processKeyframe, [
            R.prop('values'),
            R.prop('declarations')
        ]),
        R.converge(processAnimation, [
            R.nth(0),
            R.nth(1)
        ])))

    var transformAST = R.pipe(
        R.path(['stylesheet', 'rules']),
        R.filter(R.propEq('type', 'keyframes')),
        R.map((keyframe) => ({
            name: keyframe.name,
            content: getContentOfKeyframes(keyframe.keyframes)
        })),
        R.converge(R.zipObj, [
            R.map(R.prop('name')),
            R.map(R.pipe(R.prop('content'), R.flatten))
        ]))

    var result = transformAST(data)
    console.log(JSON.stringify(result));
};






    // //--------------------------------------
    // var result = {};
    // // keyframes
    // kfs.forEach(function (kf) {
    //     result[kf.name] = [];
    //     kf.keyframes.forEach(function (kfi) {
    //         kfi.values.forEach(function (v) {
    //             var r = {};
    //             var vNew;
    //             vNew = v;
    //             if (v === 'from') {
    //                 vNew = 0;
    //             } else if (v === 'to') {
    //                 vNew = 100;
    //             } else {
    //                 vNew = parseFloat(v);
    //             }
    //             r.offset = vNew;
    //             kfi.declarations.forEach(function (d) {
    //                 r[d.property] = d.value;
    //             });
    //             result[kf.name].push(r);
    //         });
    //     });
    // });


    //let result = css.stringify(obj);
    //console.log(JSON.stringify(result));




