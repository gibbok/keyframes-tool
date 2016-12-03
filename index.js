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
    var predRulesKeyframes = (rule) => rule.type === 'keyframes';
    let hasKeyframes = R.any(predRulesKeyframes, obj.stylesheet.rules);
    if (!hasKeyframes) {
        throw 'file does not contain keyframes rules';
    }
    var kfs = obj.stylesheet.rules.filter(function (rule) {
        return rule.type === 'keyframes'
    });
    var result = {};
    // keyframes
    kfs.forEach(function (kf) {
        result[kf.name] = [];
        kf.keyframes.forEach(function (kfi) {
            kfi.values.forEach(function (v) {
                var r = {};
                var vNew;
                vNew = v;
                if (v === 'from') {
                    vNew = 0;
                } else if (v === 'to') {
                    vNew = 100;
                } else {
                    vNew = parseFloat(v);
                }
                r.offset = vNew;
                kfi.declarations.forEach(function (d) {
                    r[d.property] = d.value;

                });
                result[kf.name].push(r);
            });
        });
    });

    debugger
    // get all rules with type keyframes
    // for each rule keyframe take values
    // for each values
    // loop in declarations
    // create an object for result for each property and value

    debugger




    console.log(obj);

    //let result = css.stringify(obj);
    //console.log(JSON.stringify(result));
};









