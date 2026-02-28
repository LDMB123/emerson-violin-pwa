export const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};
