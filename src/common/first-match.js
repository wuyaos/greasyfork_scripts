

const firstOf = (items, predicate) => {
        for (const item of items || []) {
            if (predicate(item)) return item;
        }
        return undefined;
    };



export { firstOf };
