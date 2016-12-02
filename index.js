const css = require('css');
const R = require('ramda');
const fs = require('fs');

fs.readFile(__dirname + '/test.css', function (err, data) {
    if (err) {
        throw err;
    }
    parse(data);
});

let parse = function (data) {
    // parse data file
    let obj = css.parse(data.toString(), { silent: false });

    // validation
    let isStylesheet = R.equals(obj.type, 'stylesheet');
    if (!isStylesheet) {
        throw 'file is not a stylesheet';
    }
    let hasParsingErrors = R.length(obj.stylesheet.parsingErrors.length) > 0;
    if (hasParsingErrors) {
        throw 'file has parsing errors';
    }
    var predKeyframes = (rule) => rule.type === 'keyframes';
    let hasKeyframes = R.any(predKeyframes, obj.stylesheet.rules);
    if (!hasKeyframes) {
        throw 'file does not contain keyframes rules';
    }

    // process rules keyframes
    let keyframesRules = R.filter(predKeyframes, obj.stylesheet.rules);

    console.log(obj);

    //let result = css.stringify(obj);
    //console.log(JSON.stringify(result));
};








