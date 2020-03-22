const { format } = require('util');
const convict = require('convict');

function isInvalidDueToEmptiness(finalVal, schema) {
    return schema.allowEmpty === false && finalVal.length === 0;
}

/**
 * A format for convict that coerces comma-separated strings into arrays.
 *
 * @type {{name: string, coerce: function, validate: function}}
 */
const listFormat = (() => {
    const coerce = (val, schema) => {
        if (!Array.isArray(val) && typeof val === 'object') {
            return null;
        }

        // First, coerce the value into an array by treating it as a comma-separated string if it isn't already an array.
        const processedVal = !Array.isArray(val)
            ? `${val || ''}`.trim().split(',')
            : val;

        // We don't use map or reduce here so we can bail early if we stumble upon a bad value.
        const finalVal = [];

        for (const item of processedVal) {
            if (
                typeof item === 'object' ||
                typeof item === 'undefined' ||
                typeof item === 'symbol' ||
                typeof item === 'function'
            ) {
                return null;
            }
            finalVal.push(item);
        }

        return finalVal;
    };

    const validate = (val, schema) => {
        const finalVal = coerce(val);
        if (finalVal === null || isInvalidDueToEmptiness(finalVal, schema)) {
            throw new Error(
                format(
                    'Expected array or string of comma-separated values, received:',
                    val,
                ),
            );
        }
    };

    return {
        name: 'list',
        validate,
        coerce,
    };
})();

const originListFormat = (() => {
    const coerce = (...restArgs) => {
        const listVal = listFormat.coerce(...restArgs);
        if (listVal === null) {
            return listVal;
        }

        // We don't use map or reduce here so we can bail early if we stumble upon a bad value.
        const finalVal = [];

        for (const item of listVal) {
            const processedItem = `${item}`.trim().toLowerCase();
            if (!processedItem) {
                return null;
            }
            finalVal.push(processedItem);
        }

        return finalVal;
    };

    const validate = (val, schema) => {
        const finalVal = coerce(val);
        if (finalVal === null || isInvalidDueToEmptiness(finalVal, schema)) {
            throw new Error(
                format(
                    'Expected array or string of comma-separated HTTP origins, received:',
                    val,
                ),
            );
        }
    };

    return {
        name: 'origin-list',
        coerce,
        validate,
    };
})();

convict.addFormat(listFormat);

convict.addFormat(originListFormat);

module.exports = convict;
