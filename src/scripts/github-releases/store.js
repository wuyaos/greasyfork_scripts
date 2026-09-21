

const shallowEqual = (objA, objB) => {
        if (Object.is(objA, objB)) return true;
        if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
            return false;
        }
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) return false;
        for (let i = 0; i < keysA.length; i++) {
            const key = keysA[i];
            if (!Object.prototype.hasOwnProperty.call(objB, key)) {
                return false;
            }
            const valA = objA[key];
            const valB = objB[key];
            if (valA instanceof Set && valB instanceof Set) {
                if (valA.size !== valB.size) return false;
                for (const item of valA) {
                    if (!valB.has(item)) return false;
                }
                continue;
            }
            if (!Object.is(valA, valB)) return false;
        }
        return true;
    };

const createStore = (initialState) => {
        let state = { ...initialState };
        const listeners = new Set();
        let isNotifying = false;
        let hasPendingUpdate = false;

        const notify = () => {
            if (isNotifying) {
                hasPendingUpdate = true;
                return;
            }
            isNotifying = true;
            listeners.forEach(listener => listener(state));
            isNotifying = false;
            if (hasPendingUpdate) {
                hasPendingUpdate = false;
                queueMicrotask(notify);
            }
        };

        const setState = (update) => {
            const nextState = { ...state, ...update };
            if (shallowEqual(state, nextState)) {
                return;
            }
            state = nextState;
            notify();
        };

        const subscribe = (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        };

        return {
            get state() { return state; },
            setState,
            subscribe
        };
    };



export { createStore };
