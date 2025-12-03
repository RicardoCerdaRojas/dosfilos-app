/**
 * Utility functions for accessing nested object properties by path
 * Single Responsibility: Path manipulation only
 */

/**
 * Get value from object by dot-notation path
 * @example getValueByPath({ context: { historical: 'text' } }, 'context.historical') => 'text'
 */
export const getValueByPath = (obj: any, path: string): any => {
    if (!obj || !path) return undefined;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[key];
    }

    return current;
};

/**
 * Set value in object by dot-notation path
 * Creates intermediate objects if they don't exist
 * @example setValueByPath({}, 'context.historical', 'text') => { context: { historical: 'text' } }
 */
export const setValueByPath = (obj: any, path: string, value: any): void => {
    if (!obj || !path) return;

    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current = obj;
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
};

/**
 * Check if path exists in object
 */
export const hasPath = (obj: any, path: string): boolean => {
    return getValueByPath(obj, path) !== undefined;
};

/**
 * Delete value at path
 */
export const deleteByPath = (obj: any, path: string): void => {
    if (!obj || !path) return;

    const keys = path.split('.');
    const lastKey = keys.pop()!;

    let current = obj;
    for (const key of keys) {
        if (!(key in current)) return;
        current = current[key];
    }

    delete current[lastKey];
};
