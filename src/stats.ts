export function getSum(values: number[]) {
    return values.reduce((a, b) => a + b, 0);
}

export function getAverage(values: number[]) {
    return getSum(values) / values.length;
}
