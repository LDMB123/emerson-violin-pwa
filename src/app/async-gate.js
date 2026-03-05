/** Creates a token gate that invalidates stale async work when a new run begins. */
export const createAsyncGate = () => {
    let activeToken = 0;
    return {
        begin() {
            activeToken += 1;
            return activeToken;
        },
        isActive(token) {
            return token === activeToken;
        },
    };
};
