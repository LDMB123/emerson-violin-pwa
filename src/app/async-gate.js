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
